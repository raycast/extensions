import { Clipboard, LaunchProps, showToast, Toast, useNavigation } from "@raycast/api";
import { showFailureToast, useLocalStorage } from "@raycast/utils";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RANDOM_BANK } from "./constants";
import type { FormPrefs } from "./form-prefs";
import { toSavedIban } from "./generate-record";
import { GenIbanForm } from "./gen-iban-form";
import { IbanDetail } from "./iban-detail";
import { generateIban } from "./lib";
import { resolveCountryInput } from "./resolve-country";
import { ibanText, type SavedIban } from "./storage";
import { VALIDITY_VALID } from "./validity";

const SAVED_IBAN_KEY = "saved-iban";
const FORM_PREFS_KEY = "gen-iban-prefs";

type RootView =
  | { mode: "loading" }
  | { mode: "form"; prefillCountry?: string }
  | { mode: "quick-detail"; record: SavedIban; prefs: FormPrefs };

function storedSavedIban(value: unknown): SavedIban | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.iban !== "string" || typeof record.format !== "string" || typeof record.savedAt !== "string") {
    return undefined;
  }
  return value as SavedIban;
}

function storedFormPrefs(value: unknown): FormPrefs | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const prefs = value as FormPrefs;
  if (!prefs.countryCode || !prefs.bankSelection || !prefs.format) {
    return undefined;
  }
  return prefs;
}

export default function Command(props: LaunchProps<{ arguments: Arguments.GenIban }>) {
  const { push } = useNavigation();
  const {
    value: savedRaw,
    isLoading: savedLoading,
    setValue: setSavedValue,
  } = useLocalStorage<unknown>(SAVED_IBAN_KEY);
  const { value: prefsRaw, isLoading: prefsLoading } = useLocalStorage<unknown>(FORM_PREFS_KEY);

  const savedIban = useMemo(() => storedSavedIban(savedRaw), [savedRaw]);
  const storageLoading = savedLoading || prefsLoading;

  const [view, setView] = useState<RootView>({ mode: "loading" });

  const onSavedIbanChange = useCallback(
    (record: SavedIban | undefined) => {
      if (record) {
        void setSavedValue(record);
      }
    },
    [setSavedValue],
  );

  useEffect(() => {
    if (storageLoading) {
      return;
    }

    let cancelled = false;

    async function init() {
      const countryArg = props.arguments.country?.trim() ?? "";
      if (!countryArg) {
        if (!cancelled) {
          setView({ mode: "form" });
        }
        return;
      }

      const resolved = resolveCountryInput(countryArg);
      if (!resolved.ok) {
        if (!cancelled) {
          setView({ mode: "form" });
        }
        const message =
          resolved.reason === "ambiguous"
            ? `"${resolved.query}" matches multiple countries`
            : `Unknown country "${resolved.query}"`;
        await showToast({ style: Toast.Style.Failure, title: "Country not recognized", message });
        return;
      }

      const storedPrefs = storedFormPrefs(prefsRaw);
      const prefs: FormPrefs = {
        countryCode: resolved.code,
        bankSelection: RANDOM_BANK,
        format: storedPrefs?.format ?? "grouped",
        copyToClipboard: storedPrefs?.copyToClipboard ?? false,
      };

      try {
        const generated = generateIban({ countryCode: resolved.code });
        const record = toSavedIban(generated, prefs.format);
        await setSavedValue(record);
        if (prefs.copyToClipboard) {
          await Clipboard.copy(ibanText(record));
        }
        if (!cancelled) {
          setView({ mode: "quick-detail", record, prefs });
        }
      } catch (error) {
        if (!cancelled) {
          setView({ mode: "form", prefillCountry: resolved.code });
        }
        await showFailureToast(error, { title: "Generation failed" });
      }
    }

    void init();

    return () => {
      cancelled = true;
    };
  }, [props.arguments.country, prefsRaw, setSavedValue, storageLoading]);

  if (view.mode === "loading" || storageLoading) {
    return <GenIbanForm isLoading savedIban={savedIban} onSavedIbanChange={onSavedIbanChange} />;
  }

  if (view.mode === "quick-detail") {
    return (
      <IbanDetail
        record={view.record}
        prefs={view.prefs}
        validity={VALIDITY_VALID}
        onSaved={onSavedIbanChange}
        onBackToSettings={() =>
          push(
            <GenIbanForm
              savedIban={savedIban}
              onSavedIbanChange={onSavedIbanChange}
              initialCountryCode={view.prefs.countryCode}
            />,
          )
        }
      />
    );
  }

  return (
    <GenIbanForm savedIban={savedIban} onSavedIbanChange={onSavedIbanChange} initialCountryCode={view.prefillCountry} />
  );
}