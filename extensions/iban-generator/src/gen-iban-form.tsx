import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Form,
  Icon,
  Keyboard,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast, useLocalStorage } from "@raycast/utils";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RANDOM_BANK } from "./constants";
import { generateRecord, toSavedIban } from "./generate-record";
import { saveFormPrefs, type FormPrefs } from "./form-prefs";
import { IbanDetail } from "./iban-detail";
import { COUNTRIES, getCountry, INVALID_KINDS } from "./lib";
import { savedIbanSummary } from "./saved-iban-display";
import { ibanText, type IbanFormat, type SavedIban } from "./storage";
import { VALIDITY_VALID, validityDropdownInfo, type ValidityChoice } from "./validity";

interface FormValues {
  country: string;
  bank: string;
  format: IbanFormat;
  copyToClipboard: boolean;
  validity: ValidityChoice;
}

const defaultCountryCode = COUNTRIES.find((c) => c.code === "DE")?.code ?? COUNTRIES[0]?.code ?? "DE";

const SAVED_IBAN_KEY = "saved-iban";
const FORM_PREFS_KEY = "gen-iban-prefs";

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

export function generationSettingsFromSaved(
  record: SavedIban,
  copyToClipboard: boolean,
): { prefs: FormPrefs; validity: ValidityChoice } {
  const country = getCountry(record.countryCode);
  const bankKnown = country?.banks.some((bank) => bank.bankCode === record.bankCode);
  return {
    prefs: {
      countryCode: record.countryCode,
      bankSelection: bankKnown ? record.bankCode : RANDOM_BANK,
      format: record.format,
      copyToClipboard,
    },
    validity: record.invalidKind ?? VALIDITY_VALID,
  };
}

interface GenIbanFormProps {
  savedIban?: SavedIban;
  onSavedIbanChange: (record: SavedIban | undefined) => void;
  initialCountryCode?: string;
  isLoading?: boolean;
}

export function GenIbanForm({
  savedIban: savedIbanProp,
  onSavedIbanChange,
  initialCountryCode,
  isLoading: isLoadingProp,
}: GenIbanFormProps) {
  const { push } = useNavigation();
  const { value: savedRaw, isLoading: savedStorageLoading, setValue: setSavedValue } = useLocalStorage<unknown>(SAVED_IBAN_KEY);
  const { value: prefsRaw, isLoading: prefsStorageLoading } = useLocalStorage<unknown>(FORM_PREFS_KEY);

  const storedSaved = useMemo(() => storedSavedIban(savedRaw), [savedRaw]);
  const savedIban = storedSaved ?? savedIbanProp;

  const [countryCode, setCountryCode] = useState(initialCountryCode ?? defaultCountryCode);
  const [bankSelection, setBankSelection] = useState(RANDOM_BANK);
  const [format, setFormat] = useState<IbanFormat>("grouped");
  const [copyToClipboard, setCopyToClipboard] = useState(false);
  const [validity, setValidity] = useState<ValidityChoice>(VALIDITY_VALID);
  const [prefsHydrated, setPrefsHydrated] = useState(false);

  const storageLoading = savedStorageLoading || prefsStorageLoading;
  const isLoading = (isLoadingProp ?? false) || storageLoading;

  const updateSaved = useCallback(
    (record: SavedIban | undefined) => {
      if (record) {
        void setSavedValue(record);
      }
      onSavedIbanChange(record);
    },
    [onSavedIbanChange, setSavedValue],
  );

  useEffect(() => {
    if (initialCountryCode) {
      setCountryCode(initialCountryCode);
    }
  }, [initialCountryCode]);

  useEffect(() => {
    if (prefsStorageLoading || prefsHydrated) {
      return;
    }

    const prefs = storedFormPrefs(prefsRaw);
    if (prefs) {
      const country = getCountry(prefs.countryCode);
      if (country && !initialCountryCode) {
        setCountryCode(prefs.countryCode);
        const bankValid =
          prefs.bankSelection === RANDOM_BANK || country.banks.some((b) => b.bankCode === prefs.bankSelection);
        setBankSelection(bankValid ? prefs.bankSelection : RANDOM_BANK);
      } else if (initialCountryCode) {
        const country = getCountry(initialCountryCode);
        if (country) {
          const bankValid =
            prefs.bankSelection === RANDOM_BANK || country.banks.some((b) => b.bankCode === prefs.bankSelection);
          setBankSelection(bankValid ? prefs.bankSelection : RANDOM_BANK);
        }
      }
      setFormat(prefs.format);
      setCopyToClipboard(prefs.copyToClipboard);
    }

    if (initialCountryCode) {
      setCountryCode(initialCountryCode);
    }

    setPrefsHydrated(true);
  }, [initialCountryCode, prefsHydrated, prefsRaw, prefsStorageLoading]);

  const selectedCountry = getCountry(countryCode);
  const sepaCountries = COUNTRIES.filter((c) => c.sepa);
  const otherCountries = COUNTRIES.filter((c) => !c.sepa);

  const persistPrefs = useCallback(async (values: FormValues) => {
    const prefs: FormPrefs = {
      countryCode: values.country,
      bankSelection: values.bank,
      format: values.format,
      copyToClipboard: values.copyToClipboard,
    };
    await saveFormPrefs(prefs);
    return prefs;
  }, []);

  const handleGenerate = useCallback(
    async (values: FormValues, pasteAfter: boolean) => {
      const prefsForGen: FormPrefs = {
        countryCode: values.country,
        bankSelection: values.bank,
        format: values.format,
        copyToClipboard: values.copyToClipboard,
      };

      try {
        const generated = generateRecord(prefsForGen, values.validity);
        const record = toSavedIban(generated, values.format);
        const prefs = await persistPrefs(values);

        updateSaved(record);

        const text = ibanText(record);

        if (values.copyToClipboard) {
          await Clipboard.copy(text);
        }

        if (pasteAfter) {
          await Clipboard.paste(text);
          await showHUD(record.invalidKind ? "Pasted invalid test IBAN" : `Pasted ${record.flag} IBAN`);
          return;
        }

        await showToast({
          style: Toast.Style.Success,
          title: "IBAN generated",
        });

        push(<IbanDetail record={record} prefs={prefs} validity={values.validity} onSaved={updateSaved} />);
      } catch (error) {
        await showFailureToast(error, { title: "Generation failed" });
      }
    },
    [persistPrefs, push, setSavedValue, updateSaved],
  );

  const onCountryChange = useCallback((newCode: string) => {
    setCountryCode((prev) => {
      if (prev !== newCode) {
        setBankSelection(RANDOM_BANK);
      }
      return newCode;
    });
  }, []);

  if (isLoading) {
    return <Form isLoading />;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Generate IBAN"
            icon={Icon.Wand}
            onSubmit={(values: FormValues) => handleGenerate(values, false)}
          />
          <Action.SubmitForm
            title="Generate and Paste"
            icon={Icon.Clipboard}
            onSubmit={(values: FormValues) => handleGenerate(values, true)}
          />
          {savedIban ? (
            <Action
              title="View Saved IBAN"
              icon={Icon.Eye}
              shortcut={Keyboard.Shortcut.Common.Open}
              onAction={() => {
                const storedPrefs = storedFormPrefs(prefsRaw);
                const { prefs, validity: savedValidity } = generationSettingsFromSaved(
                  savedIban,
                  storedPrefs?.copyToClipboard ?? copyToClipboard,
                );
                push(<IbanDetail record={savedIban} prefs={prefs} validity={savedValidity} onSaved={updateSaved} />);
              }}
            />
          ) : null}
        </ActionPanel>
      }
    >
      {savedIban ? (
        <Form.Description title="Currently saved" text={savedIbanSummary(savedIban)} />
      ) : (
        <Form.Description title="Currently saved" text="No IBAN saved yet — generate one below." />
      )}

      <Form.Dropdown id="country" title="Country" value={countryCode} onChange={onCountryChange} filtering>
        {sepaCountries.length > 0 ? (
          <Form.Dropdown.Section title="SEPA">
            {sepaCountries.map((country) => (
              <Form.Dropdown.Item
                key={country.code}
                value={country.code}
                title={country.name}
                icon={country.flag}
                keywords={[country.code, country.name]}
              />
            ))}
          </Form.Dropdown.Section>
        ) : null}
        {otherCountries.length > 0 ? (
          <Form.Dropdown.Section title="Other">
            {otherCountries.map((country) => (
              <Form.Dropdown.Item
                key={country.code}
                value={country.code}
                title={country.name}
                icon={country.flag}
                keywords={[country.code, country.name]}
              />
            ))}
          </Form.Dropdown.Section>
        ) : null}
      </Form.Dropdown>

      <Form.Dropdown id="bank" title="Bank" value={bankSelection} onChange={setBankSelection}>
        <Form.Dropdown.Item
          value={RANDOM_BANK}
          title="Random Bank"
          icon={{ source: Icon.Shuffle, tintColor: Color.Purple }}
        />
        {selectedCountry?.banks.map((bank) => (
          <Form.Dropdown.Item
            key={bank.bankCode}
            value={bank.bankCode}
            title={`${bank.name} (${bank.bankCode})`}
            icon={{ source: Icon.Building, tintColor: Color.Blue }}
            keywords={[bank.name, bank.bankCode, bank.bic ?? ""]}
          />
        ))}
      </Form.Dropdown>

      {selectedCountry && selectedCountry.banks.length === 0 ? (
        <Form.Description title="Bank" text="No known banks for this country — a random bank code will be used." />
      ) : null}

      <Form.Dropdown
        id="validity"
        title="Validity"
        value={validity}
        onChange={(value) => setValidity(value as ValidityChoice)}
        info={validityDropdownInfo(validity)}
      >
        <Form.Dropdown.Item
          value={VALIDITY_VALID}
          title="Valid"
          icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
        />
        {INVALID_KINDS.map((entry) => (
          <Form.Dropdown.Item
            key={entry.kind}
            value={entry.kind}
            title={entry.title}
            icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown id="format" title="Format" value={format} onChange={(v) => setFormat(v as IbanFormat)}>
        <Form.Dropdown.Item
          value="grouped"
          title="Grouped (DE89 3704 0044 …)"
          icon={{ source: Icon.TextInput, tintColor: Color.Green }}
        />
        <Form.Dropdown.Item
          value="compact"
          title="Compact (DE8937040044…)"
          icon={{ source: Icon.Text, tintColor: Color.SecondaryText }}
        />
      </Form.Dropdown>

      <Form.Checkbox
        id="copyToClipboard"
        label="Copy to clipboard after generating"
        value={copyToClipboard}
        onChange={setCopyToClipboard}
      />
    </Form>
  );
}