import {
  ActionPanel,
  Icon,
  Clipboard,
  Action,
  showHUD,
  Form,
  showToast,
  Toast,
  LocalStorage,
  Detail,
} from "@raycast/api";
import { useBitwarden, useOneTimePasswordHistoryWarning, usePasswordGenerator, usePasswordOptions } from "./hooks";
import { UnlockForm } from "./components";
import { Bitwarden } from "./api";
import { LOCAL_STORAGE_KEY, PASSWORD_OPTIONS_MAP } from "./const";
import { capitalise, objectEntries } from "./utils";
import { PasswordGeneratorOptions, PasswordOptionField, PasswordOptionsToFieldEntries, PasswordType } from "./types";
import { Shortcut } from "@raycast/api/types/api/app/keyboard";
import { debounce } from "throttle-debounce";

const SHORTCUTS = {
  COPY_TO_CLIPBOARD: { key: "enter", modifiers: ["opt"] } as Shortcut,
  REGENERATE_PASSWORD: { key: "backspace", modifiers: ["opt"] } as Shortcut,
};

const FormSpace = () => <Form.Description text="" />;

const GeneratePassword = () => {
  const bitwardenApi = new Bitwarden();
  const [state, setSessionToken] = useBitwarden(bitwardenApi);
  const { options, setOption } = usePasswordOptions();
  const { password, regeneratePassword, isGenerating } = usePasswordGenerator(bitwardenApi, options);

  useOneTimePasswordHistoryWarning();

  if (state.vaultStatus === "locked") {
    return <UnlockForm setSessionToken={setSessionToken} bitwardenApi={bitwardenApi} />;
  }
  if (!options) {
    return <Detail isLoading={true} />;
  }

  const showDebouncedToast = debounce(500, showToast);

  const copyToClipboard = async () => {
    if (!password) return;
    await Clipboard.copy(password);
    showHUD("Copied to clipboard");
  };

  const regenerate = () => regeneratePassword();

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
          <Action
            title="Copy password"
            icon={Icon.Clipboard}
            onAction={copyToClipboard}
            shortcut={SHORTCUTS.COPY_TO_CLIPBOARD}
          />
          <Action
            title="Regenerate password"
            icon={Icon.ArrowClockwise}
            onAction={regenerate}
            shortcut={SHORTCUTS.REGENERATE_PASSWORD}
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
        {objectEntries(PASSWORD_OPTIONS_MAP).map(([key]) => (
          <Form.Dropdown.Item key={key} value={key} title={capitalise(key)} />
        ))}
      </Form.Dropdown>
      {objectEntries(PASSWORD_OPTIONS_MAP[passwordType]).map(([option, optionField]: PasswordOptionsToFieldEntries) => (
        <OptionField
          key={option}
          option={option}
          field={optionField}
          currentOptions={options}
          handleFieldChange={handleFieldChange(option, optionField.errorMessage)}
        />
      ))}
    </Form>
  );
};

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
        value={Boolean(option ? currentOptions?.[option] ?? false : false)}
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
      value={String(option ? currentOptions?.[option] ?? "" : "")}
      onChange={handleFieldChange}
    />
  );
}

export default GeneratePassword;
