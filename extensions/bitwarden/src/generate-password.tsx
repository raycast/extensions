import {
  ActionPanel,
  Icon,
  Action,
  Form,
  showToast,
  Toast,
  LocalStorage,
  Detail,
  getPreferenceValues,
  List,
} from "@raycast/api";
import { usePasswordGenerator, usePasswordHistory } from "./hooks";
import { Bitwarden } from "./api";
import { LOCAL_STORAGE_KEY, PASSWORD_OPTIONS_MAP } from "./const";
import { capitalise } from "./utils";
import {
  PasswordGeneratorOptions,
  PasswordHistoryItem,
  PasswordOptionField,
  PasswordOptionsToFieldEntries,
  PasswordType,
  Preferences,
} from "./types";
import { debounce } from "throttle-debounce";
import { TroubleshootingGuide } from "./components";
import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";

const FormSpace = () => <Form.Description text="" />;

function GeneratePassword() {
  try {
    const { cliPath, clientId, clientSecret } = getPreferenceValues<Preferences>();
    const bitwardenApi = new Bitwarden(clientId, clientSecret, cliPath);
    return <PasswordGenerator bitwardenApi={bitwardenApi} />;
  } catch {
    return <TroubleshootingGuide />;
  }
}

function PasswordGenerator(props: { bitwardenApi: Bitwarden }) {
  const { password, regeneratePassword, isGenerating, options, setOption } = usePasswordGenerator(props.bitwardenApi);

  if (!options) return <Detail isLoading={true} />;

  const showDebouncedToast = debounce(1000, showToast);

  const handlePasswordTypeChange = (type: string) => {
    setOption("passphrase", type === "passphrase");
  };

  const handleFieldChange =
    <O extends keyof PasswordGeneratorOptions>(field: O, errorMessage?: string) =>
    async (value: PasswordGeneratorOptions[O]) => {
      if (isValidFieldValue(field, value)) {
        showDebouncedToast.cancel();
        setOption(field, value);
        return;
      }

      if (errorMessage) {
        showDebouncedToast(Toast.Style.Failure, errorMessage);
      }
    };

  const passwordType: PasswordType = options?.passphrase ? "passphrase" : "password";

  return (
    <Form
      isLoading={isGenerating}
      actions={
        <ActionPanel>
          {!!password && (
            <>
              <Action.CopyToClipboard
                title="Copy password"
                icon={Icon.Clipboard}
                content={password}
                shortcut={{ key: "enter", modifiers: ["cmd"] }}
              />
              <Action.Paste
                title="Paste password to active app"
                icon={Icon.Text}
                content={password}
                shortcut={{ key: "enter", modifiers: ["cmd", "shift"] }}
              />
            </>
          )}

          <Action
            title="Regenerate password"
            icon={Icon.ArrowClockwise}
            onAction={regeneratePassword}
            shortcut={{ key: "backspace", modifiers: ["cmd"] }}
          />
          <Action.Push
            title="Password history"
            icon={Icon.List}
            target={<PasswordHistory />}
            shortcut={{ key: "h", modifiers: ["cmd"] }}
          />
          {process.env.NODE_ENV === "development" && (
            <Action title="Clear storage" icon={Icon.Trash} onAction={clearStorage} />
          )}
        </ActionPanel>
      }
    >
      <Form.Description title="🔑  Password" text={password ?? "Generating..."} />
      <FormSpace />
      <Form.Separator />
      <Form.Dropdown
        id="type"
        title="Type"
        value={passwordType}
        onChange={handlePasswordTypeChange}
        defaultValue="password"
      >
        {Object.keys(PASSWORD_OPTIONS_MAP).map((key) => (
          <Form.Dropdown.Item key={key} value={key} title={capitalise(key)} />
        ))}
      </Form.Dropdown>
      {Object.typedEntries(PASSWORD_OPTIONS_MAP[passwordType]).map(
        ([option, optionField]: PasswordOptionsToFieldEntries) => (
          <OptionField
            key={option}
            option={option}
            field={optionField}
            currentOptions={options}
            handleFieldChange={handleFieldChange(option, optionField.errorMessage)}
          />
        )
      )}
    </Form>
  );
}

async function clearStorage() {
  for (const key of Object.values(LOCAL_STORAGE_KEY)) {
    await LocalStorage.removeItem(key);
  }
}

function isValidFieldValue<O extends keyof PasswordGeneratorOptions>(field: O, value: PasswordGeneratorOptions[O]) {
  if (field === "length") return !isNaN(Number(value)) && Number(value) >= 5 && Number(value) <= 128;
  if (field === "separator") return (value as string).length === 1;
  if (field === "words") return !isNaN(Number(value)) && Number(value) >= 3 && Number(value) <= 20;
  return true;
}

type OptionFieldProps = {
  field: PasswordOptionField;
  option: keyof PasswordGeneratorOptions;
  currentOptions: PasswordGeneratorOptions | undefined;
  handleFieldChange: (value: PasswordGeneratorOptions[keyof PasswordGeneratorOptions]) => Promise<void>;
};

function OptionField({ option, currentOptions, handleFieldChange, field }: OptionFieldProps) {
  const { hint = "", label, type } = field;

  if (type === "boolean") {
    return (
      <Form.Checkbox
        key={option}
        id={option}
        title={label}
        label={hint}
        value={Boolean(currentOptions?.[option])}
        onChange={handleFieldChange}
      />
    );
  }

  return (
    <Form.TextField
      key={option}
      id={option}
      title={label}
      placeholder={hint}
      value={String(currentOptions?.[option] ?? "")}
      onChange={handleFieldChange}
    />
  );
}

function PasswordHistory() {
  const [items, setItems] = useState<PasswordHistoryItem[]>([]);
  const { getAll, clear } = usePasswordHistory();

  useEffect(() => {
    const historyItems = getAll();
    if (!historyItems) return;
    setItems(historyItems);
  }, []);

  const handleClear = () => {
    clear();
    setItems([]);
  };

  return (
    <List navigationTitle="Generate Password - History">
      {items.map(({ type, password, datetime }) => (
        <List.Item
          key={password}
          title={password}
          icon={Icon.Clipboard}
          keywords={[type]}
          accessories={[{ text: format(parseISO(datetime), "d MMM yyyy, HH:mm:ss"), tooltip: datetime }]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy to clipboard" icon={Icon.Clipboard} content={password} />
              <Action
                title="Clear history"
                icon={Icon.Trash}
                onAction={handleClear}
                shortcut={{ key: "backspace", modifiers: ["cmd", "shift"] }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default GeneratePassword;
