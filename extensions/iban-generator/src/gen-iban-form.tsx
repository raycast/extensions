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
import { useCallback, useEffect, useState } from "react";
import { RANDOM_BANK } from "./constants";
import { generateRecord, toSavedIban } from "./generate-record";
import { loadFormPrefs, saveFormPrefs, type FormPrefs } from "./form-prefs";
import { IbanDetail } from "./iban-detail";
import { COUNTRIES, getCountry, INVALID_KINDS } from "./lib";
import { savedIbanSummary } from "./saved-iban-display";
import { generateAndPasteShortcut } from "./shortcuts";
import { ibanText, loadIban, saveIban, type IbanFormat, type SavedIban } from "./storage";
import { VALIDITY_VALID, validityDropdownInfo, type ValidityChoice } from "./validity";

interface FormValues {
  country: string;
  bank: string;
  format: IbanFormat;
  copyToClipboard: boolean;
  validity: ValidityChoice;
}

const defaultCountryCode = COUNTRIES.find((c) => c.code === "DE")?.code ?? COUNTRIES[0]?.code ?? "DE";

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
  const [isLoading, setIsLoading] = useState(isLoadingProp ?? true);
  const [savedIban, setSavedIban] = useState(savedIbanProp);
  const [countryCode, setCountryCode] = useState(initialCountryCode ?? defaultCountryCode);
  const [bankSelection, setBankSelection] = useState(RANDOM_BANK);
  const [format, setFormat] = useState<IbanFormat>("grouped");
  const [copyToClipboard, setCopyToClipboard] = useState(false);
  const [validity, setValidity] = useState<ValidityChoice>(VALIDITY_VALID);

  const updateSaved = useCallback(
    (record: SavedIban | undefined) => {
      setSavedIban(record);
      onSavedIbanChange(record);
    },
    [onSavedIbanChange],
  );

  useEffect(() => {
    setSavedIban(savedIbanProp);
  }, [savedIbanProp]);

  useEffect(() => {
    if (initialCountryCode) {
      setCountryCode(initialCountryCode);
    }
  }, [initialCountryCode]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [saved, prefs] = await Promise.all([loadIban(), loadFormPrefs()]);
      if (cancelled) {
        return;
      }

      updateSaved(saved);

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

      setIsLoading(false);
    }

    if (!isLoadingProp) {
      void load();
    }

    return () => {
      cancelled = true;
    };
  }, [initialCountryCode, isLoadingProp, updateSaved]);

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

        await saveIban(record);
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
        const message = error instanceof Error ? error.message : "Could not generate IBAN";
        await showToast({ style: Toast.Style.Failure, title: "Generation failed", message });
      }
    },
    [persistPrefs, push, updateSaved],
  );

  const onCountryChange = useCallback((newCode: string) => {
    setCountryCode((prev) => {
      if (prev !== newCode) {
        setBankSelection(RANDOM_BANK);
      }
      return newCode;
    });
  }, []);

  if (isLoading || isLoadingProp) {
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
            shortcut={generateAndPasteShortcut}
            onSubmit={(values: FormValues) => handleGenerate(values, true)}
          />
          {savedIban ? (
            <Action
              title="View Saved IBAN"
              icon={Icon.Eye}
              shortcut={Keyboard.Shortcut.Common.Open}
              onAction={() => {
                void (async () => {
                  const prefs = (await loadFormPrefs()) ?? {
                    countryCode,
                    bankSelection,
                    format,
                    copyToClipboard,
                  };
                  push(<IbanDetail record={savedIban} prefs={prefs} validity={validity} onSaved={updateSaved} />);
                })();
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
