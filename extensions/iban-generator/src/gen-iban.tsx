import { LaunchProps, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { RANDOM_BANK } from "./constants";
import type { FormPrefs } from "./form-prefs";
import { toSavedIban } from "./generate-record";
import { GenIbanForm } from "./gen-iban-form";
import { IbanDetail } from "./iban-detail";
import { generateIban } from "./lib";
import { loadFormPrefs } from "./form-prefs";
import { resolveCountryInput } from "./resolve-country";
import { loadIban, saveIban, type SavedIban } from "./storage";
import { VALIDITY_VALID } from "./validity";

type RootView =
  | { mode: "loading" }
  | { mode: "form"; prefillCountry?: string }
  | { mode: "quick-detail"; record: SavedIban; prefs: FormPrefs };

export default function Command(props: LaunchProps<{ arguments: { country?: string } }>) {
  const [view, setView] = useState<RootView>({ mode: "loading" });
  const [savedIban, setSavedIban] = useState<SavedIban | undefined>();

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const saved = await loadIban();
      if (!cancelled) {
        setSavedIban(saved);
      }

      const arg = props.arguments.country?.trim() ?? "";
      if (!arg) {
        if (!cancelled) {
          setView({ mode: "form" });
        }
        return;
      }

      const resolved = resolveCountryInput(arg);
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

      const storedPrefs = await loadFormPrefs();
      const prefs: FormPrefs = {
        countryCode: resolved.code,
        bankSelection: RANDOM_BANK,
        format: storedPrefs?.format ?? "grouped",
        copyToClipboard: storedPrefs?.copyToClipboard ?? false,
      };

      try {
        const generated = generateIban({ countryCode: resolved.code });
        const record = toSavedIban(generated, prefs.format);
        await saveIban(record);
        if (!cancelled) {
          setSavedIban(record);
          setView({ mode: "quick-detail", record, prefs });
        }
      } catch (error) {
        if (!cancelled) {
          setView({ mode: "form", prefillCountry: resolved.code });
        }
        await showToast({
          style: Toast.Style.Failure,
          title: "Generation failed",
          message: error instanceof Error ? error.message : "Could not generate IBAN",
        });
      }
    }

    void init();

    return () => {
      cancelled = true;
    };
  }, [props.arguments.country]);

  if (view.mode === "loading") {
    return <GenIbanForm isLoading savedIban={savedIban} onSavedIbanChange={setSavedIban} />;
  }

  if (view.mode === "quick-detail") {
    return (
      <IbanDetail
        record={view.record}
        prefs={view.prefs}
        validity={VALIDITY_VALID}
        onSaved={setSavedIban}
        onBackToSettings={() => setView({ mode: "form", prefillCountry: view.prefs.countryCode })}
      />
    );
  }

  return (
    <GenIbanForm savedIban={savedIban} onSavedIbanChange={setSavedIban} initialCountryCode={view.prefillCountry} />
  );
}
