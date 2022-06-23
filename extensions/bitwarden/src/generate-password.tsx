import { ActionPanel, Icon, Action, Form, showToast, Toast, LocalStorage, Detail } from "@raycast/api";
import { useOneTimePasswordHistoryWarning, usePasswordGenerator } from "./hooks";
import { Bitwarden } from "./api";
import { LOCAL_STORAGE_KEY, PASSWORD_OPTIONS_MAP } from "./const";
import { capitalise } from "./utils";
import { PasswordGeneratorOptions, PasswordOptionField, PasswordOptionsToFieldEntries, PasswordType } from "./types";
import { debounce } from "throttle-debounce";
import { TroubleshootingGuide } from "./components";

const FormSpace = () => <Form.Description text="" />;

function GeneratePassword() {
  try {
    const bitwardenApi = new Bitwarden();
    return <PasswordGenerator bitwardenApi={bitwardenApi} />;
  } catch {
    return <TroubleshootingGuide />;
  }
}

function PasswordGenerator({ bitwardenApi }: { bitwardenApi: Bitwarden }) {
  const { password, regeneratePassword, isGenerating, options, setOption } = usePasswordGenerator(bitwardenApi);

  useOneTimePasswordHistoryWarning();

  if (!options) return <Detail isLoading />;

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

export default GeneratePassword;
