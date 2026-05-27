import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Form,
  Icon,
  List,
  LocalStorage,
  showHUD,
  showToast,
  Toast,
  getPreferenceValues,
} from "@raycast/api";
import { useForm, useCachedState } from "@raycast/utils";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  estimatePasswordEntropy,
  estimatePassphraseEntropy,
  estimatePinEntropy,
  generatePassword,
  generatePassphrase,
  generatePin,
} from "./password";

interface FormValues {
  mode: string;
  length: string;
  useUppercase: boolean;
  useLowercase: boolean;
  useDigits: boolean;
  useSymbols: boolean;
  useAmbiguous: boolean;
  minUppercase: string;
  minLowercase: string;
  minDigits: string;
  minSymbols: string;
  avoidRepeated: boolean;
  wordCount: string;
  separator: string;
  capitalize: boolean;
  includeNumber: boolean;
  pinLength: string;
}

interface Preferences {
  autoCopy: boolean;
}

interface HistoryItem {
  id: string;
  value: string;
  type: string;
  timestamp: number;
}

const STORAGE_KEY = "prefs";
const HISTORY_KEY = "history";

const DEFAULTS: FormValues = {
  mode: "password",
  length: "20",
  useUppercase: true,
  useLowercase: true,
  useDigits: true,
  useSymbols: true,
  useAmbiguous: false,
  minUppercase: "1",
  minLowercase: "1",
  minDigits: "1",
  minSymbols: "1",
  avoidRepeated: false,
  wordCount: "6",
  separator: "-",
  capitalize: false,
  includeNumber: true,
  pinLength: "6",
};

async function loadPrefs(): Promise<FormValues> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (raw) {
    try {
      return { ...DEFAULTS, ...JSON.parse(raw) };
    } catch {
      return DEFAULTS;
    }
  }
  return DEFAULTS;
}

function parseMinValues(values: FormValues) {
  return {
    minUppercase: Math.max(0, parseInt(values.minUppercase, 10) || 0),
    minLowercase: Math.max(0, parseInt(values.minLowercase, 10) || 0),
    minDigits: Math.max(0, parseInt(values.minDigits, 10) || 0),
    minSymbols: Math.max(0, parseInt(values.minSymbols, 10) || 0),
  };
}

function generatePreview(values: FormValues): string {
  if (values.mode === "password") {
    const n = parseInt(values.length, 10);
    if (isNaN(n) || n < 1 || n > 256) return "";
    return generatePassword({
      length: n,
      useUppercase: values.useUppercase,
      useLowercase: values.useLowercase,
      useDigits: values.useDigits,
      useSymbols: values.useSymbols,
      useAmbiguous: values.useAmbiguous,
      ...parseMinValues(values),
      avoidRepeated: values.avoidRepeated,
    });
  }
  if (values.mode === "passphrase") {
    const n = parseInt(values.wordCount, 10);
    if (isNaN(n) || n < 3 || n > 20) return "";
    return generatePassphrase({
      wordCount: n,
      separator: values.separator || "-",
      capitalize: values.capitalize,
      includeNumber: values.includeNumber,
    });
  }
  const n = parseInt(values.pinLength, 10);
  if (isNaN(n) || n < 1 || n > 256) return "";
  return generatePin({ length: n });
}

function calcEntropy(values: FormValues): number {
  if (values.mode === "password") {
    const n = parseInt(values.length, 10);
    if (!isNaN(n) && n >= 1 && n <= 256) {
      return estimatePasswordEntropy({
        length: n,
        useUppercase: values.useUppercase,
        useLowercase: values.useLowercase,
        useDigits: values.useDigits,
        useSymbols: values.useSymbols,
        useAmbiguous: values.useAmbiguous,
        ...parseMinValues(values),
        avoidRepeated: values.avoidRepeated,
      });
    }
  } else if (values.mode === "passphrase") {
    const n = parseInt(values.wordCount, 10);
    if (!isNaN(n) && n >= 3 && n <= 20) {
      return estimatePassphraseEntropy({
        wordCount: n,
        separator: values.separator || "-",
        capitalize: values.capitalize,
        includeNumber: values.includeNumber,
      });
    }
  } else {
    const n = parseInt(values.pinLength, 10);
    if (!isNaN(n) && n >= 1 && n <= 256) {
      return estimatePinEntropy({ length: n });
    }
  }
  return 0;
}

function strengthLabel(bits: number): {
  label: string;
  icon: Icon;
  color: Color;
  bar: string;
} {
  if (bits >= 120)
    return {
      label: "Paranoid",
      icon: Icon.Shield,
      color: Color.Purple,
      bar: "█████",
    };
  if (bits >= 100)
    return {
      label: "Very Strong",
      icon: Icon.CheckCircle,
      color: Color.Blue,
      bar: "████▓",
    };
  if (bits >= 80)
    return {
      label: "Strong",
      icon: Icon.CheckCircle,
      color: Color.Green,
      bar: "███▓░",
    };
  if (bits >= 60)
    return {
      label: "Good",
      icon: Icon.Info,
      color: Color.Yellow,
      bar: "██▓░░",
    };
  if (bits >= 50)
    return {
      label: "Moderate",
      icon: Icon.Info,
      color: Color.Orange,
      bar: "█▓░░░",
    };
  return {
    label: "Weak",
    icon: Icon.ExclamationMark,
    color: Color.Red,
    bar: "▓░░░░",
  };
}

type FormItemProps = ReturnType<typeof useForm<FormValues>>["itemProps"];

function PasswordFields({ itemProps }: { itemProps: FormItemProps }) {
  return (
    <>
      <Form.TextField
        title="Length"
        placeholder="20"
        info="Between 1 and 256 characters"
        {...itemProps.length}
      />
      <Form.Checkbox label="Uppercase (A–Z)" {...itemProps.useUppercase} />
      <Form.Checkbox label="Lowercase (a–z)" {...itemProps.useLowercase} />
      <Form.Checkbox label="Digits (0–9)" {...itemProps.useDigits} />
      <Form.Checkbox label="Symbols (!@#$%...)" {...itemProps.useSymbols} />
      <Form.Checkbox
        label="Include ambiguous characters (0 O 1 l I |)"
        {...itemProps.useAmbiguous}
      />
      <Form.Separator />
      <Form.Description
        title="Minimum per type"
        text="Set to 0 to allow passwords without this character type"
      />
      <Form.TextField
        title="Min Uppercase"
        placeholder="1"
        info="Minimum uppercase letters required"
        {...itemProps.minUppercase}
      />
      <Form.TextField
        title="Min Lowercase"
        placeholder="1"
        info="Minimum lowercase letters required"
        {...itemProps.minLowercase}
      />
      <Form.TextField
        title="Min Digits"
        placeholder="1"
        info="Minimum digits required"
        {...itemProps.minDigits}
      />
      <Form.TextField
        title="Min Symbols"
        placeholder="1"
        info="Minimum symbols required"
        {...itemProps.minSymbols}
      />
      <Form.Checkbox
        label="Avoid repeated characters"
        info="Prevents consecutive duplicate characters (e.g. 'aa' or '77')"
        {...itemProps.avoidRepeated}
      />
    </>
  );
}

function PassphraseFields({ itemProps }: { itemProps: FormItemProps }) {
  return (
    <>
      <Form.TextField
        title="Words"
        placeholder="6"
        info="3–20 words. 5+ recommended per NIST guidelines"
        {...itemProps.wordCount}
      />
      <Form.TextField
        title="Separator"
        placeholder="-"
        {...itemProps.separator}
      />
      <Form.Checkbox label="Capitalize each word" {...itemProps.capitalize} />
      <Form.Checkbox
        label="Append a random number"
        {...itemProps.includeNumber}
      />
    </>
  );
}

function PinFields({ itemProps }: { itemProps: FormItemProps }) {
  return (
    <Form.TextField
      title="Length"
      placeholder="6"
      info="Between 1 and 256 characters"
      {...itemProps.pinLength}
    />
  );
}

function HistoryView() {
  const [history, setHistory] = useCachedState<HistoryItem[]>(HISTORY_KEY, []);

  const removeItem = (id: string) => {
    setHistory((prev) => prev.filter((h) => h.id !== id));
  };

  return (
    <List
      navigationTitle="Password History"
      searchBarPlaceholder="Search passwords..."
    >
      <List.EmptyView
        icon={Icon.EyeDisabled}
        title="No history"
        description="Generated passwords will appear here"
      />
      {history.map((item) => (
        <List.Item
          key={item.id}
          title={item.value}
          subtitle={item.type}
          accessories={[
            {
              text: new Date(item.timestamp).toLocaleString(),
              icon: Icon.Clock,
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Copy"
                icon={Icon.CopyClipboard}
                onAction={async () => {
                  await Clipboard.copy(item.value);
                  await showHUD("Copied from history");
                }}
              />
              <Action
                title="Delete"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["cmd"], key: "x" }}
                onAction={() => removeItem(item.id)}
              />
              <ActionPanel.Section>
                <Action
                  title="Delete All"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => setHistory([])}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [history, setHistory] = useCachedState<HistoryItem[]>(HISTORY_KEY, []);

  const addToHistory = useCallback(
    (value: string, type: string) => {
      setHistory((prev) => {
        const newItem: HistoryItem = {
          id: Math.random().toString(36).substring(2, 9),
          value,
          type,
          timestamp: Date.now(),
        };
        const filtered = prev.filter((item) => item.value !== value);
        return [newItem, ...filtered].slice(0, 10);
      });
    },
    [setHistory],
  );

  const { handleSubmit, itemProps, values, setValue, reset } =
    useForm<FormValues>({
      initialValues: DEFAULTS,
      validation: {
        length: (value) => {
          if (values.mode !== "password") return;
          const n = parseInt(value || "", 10);
          if (isNaN(n) || n < 1 || n > 256)
            return "Length must be between 1 and 256";
        },
        wordCount: (value) => {
          if (values.mode !== "passphrase") return;
          const n = parseInt(value || "", 10);
          if (isNaN(n) || n < 3 || n > 20)
            return "Word count must be between 3 and 20";
        },
        pinLength: (value) => {
          if (values.mode !== "pin") return;
          const n = parseInt(value || "", 10);
          if (isNaN(n) || n < 1 || n > 256)
            return "PIN length must be between 1 and 256";
        },
      },
      onSubmit: async (formValues) => {
        const password = generatePreview(formValues);
        if (!password) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Invalid parameters",
          });
          return;
        }
        await Clipboard.copy(password);
        addToHistory(password, formValues.mode);
        await showHUD(
          `${formValues.mode.charAt(0).toUpperCase() + formValues.mode.slice(1)} copied to clipboard`,
        );
        LocalStorage.setItem(STORAGE_KEY, JSON.stringify(formValues));
      },
    });

  const [preview, setPreview] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadPrefs().then((prefs) => {
      for (const key of Object.keys(prefs) as (keyof FormValues)[]) {
        if (prefs[key] !== DEFAULTS[key]) {
          setValue(key, prefs[key] as never);
        }
      }
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    setPreview(generatePreview(values));
  }, [values]);

  useEffect(() => {
    if (!loaded) return;
    LocalStorage.setItem(STORAGE_KEY, JSON.stringify(values));
  }, [values, loaded]);

  const [autoCopied, setAutoCopied] = useState(false);
  useEffect(() => {
    if (loaded && preferences.autoCopy && !autoCopied && preview) {
      Clipboard.copy(preview);
      addToHistory(preview, values.mode);
      showHUD("Auto-copied to clipboard");
      setAutoCopied(true);
    }
  }, [
    loaded,
    preview,
    preferences.autoCopy,
    autoCopied,
    values.mode,
    addToHistory,
  ]);

  const regenerate = useCallback(
    () => setPreview(generatePreview(values)),
    [values],
  );

  const entropy = useMemo(() => calcEntropy(values), [values]);
  const strength = useMemo(() => strengthLabel(entropy), [entropy]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Copy Preview"
            icon={Icon.CopyClipboard}
            onSubmit={handleSubmit}
          />
          <Action
            title="Generate & Copy"
            icon={Icon.PlusCircle}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            onAction={async () => {
              const newPassword = generatePreview(values);
              setPreview(newPassword);
              await Clipboard.copy(newPassword);
              addToHistory(newPassword, values.mode);
              await showHUD("New password generated and copied");
            }}
          />
          <Action
            title="Paste to Active App"
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd"], key: "v" }}
            onAction={async () => {
              if (!preview) return;
              await Clipboard.paste(preview);
              await showHUD("Pasted to active app");
            }}
          />
          <ActionPanel.Section title="History">
            <Action.Push
              title="View History"
              icon={Icon.Clock}
              shortcut={{ modifiers: ["cmd"], key: "h" }}
              target={<HistoryView />}
            />
            {history.length > 0 && (
              <Action
                title="Clear History"
                icon={Icon.Trash}
                onAction={() => setHistory([])}
                style={Action.Style.Destructive}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section title="Settings">
            <Action
              title="Regenerate Preview"
              icon={Icon.RotateClockwise}
              onAction={regenerate}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
            <Action
              title="Reset to Defaults"
              icon={Icon.Undo}
              onAction={() => reset(DEFAULTS)}
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Type" {...itemProps.mode}>
        <Form.Dropdown.Item value="password" title="Password" icon={Icon.Key} />
        <Form.Dropdown.Item
          value="passphrase"
          title="Passphrase"
          icon={Icon.Text}
        />
        <Form.Dropdown.Item value="pin" title="PIN" icon={Icon.Pencil} />
      </Form.Dropdown>
      <Form.Separator />

      {values.mode === "password" && <PasswordFields itemProps={itemProps} />}
      {values.mode === "passphrase" && (
        <PassphraseFields itemProps={itemProps} />
      )}
      {values.mode === "pin" && <PinFields itemProps={itemProps} />}

      <Form.Separator />
      {preview && <Form.Description title="Preview" text={preview} />}
      <Form.Description
        title={`${strength.bar} ${strength.label}`}
        text={`~${entropy} bits of entropy`}
      />
    </Form>
  );
}
