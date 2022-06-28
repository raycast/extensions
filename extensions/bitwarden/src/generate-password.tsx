import { ActionPanel, Icon, Action, Form, showToast, Toast, LocalStorage, Detail } from "@raycast/api";
import { useOneTimePasswordHistoryWarning, usePasswordGenerator } from "./hooks";
import { Bitwarden } from "./api";
import { LOCAL_STORAGE_KEY, PASSWORD_OPTIONS_MAP } from "./const";
import { capitalise } from "./utils";
import {
  PasswordGeneratorOptions as PassGenOptions,
  PasswordOptionField,
  PasswordOptionsToFieldEntries,
  PasswordType,
} from "./types";
import { TroubleshootingGuide } from "./components";
import { useRef, useState } from "react";

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
      <OptionForm options={options} onOptionChange={setOption} />
    </Form>
  );
}

type OptionFormProps = {
  options: PassGenOptions;
  onOptionChange: ReturnType<typeof usePasswordGenerator>["setOption"];
};

function OptionForm({ options, onOptionChange: saveOption }: OptionFormProps) {
  const [formOptions, setFormOptions] = useState(options);
  const validationToastRef = useRef<Toast>();

  const updateFormOptions = <O extends keyof PassGenOptions>(option: O, value: PassGenOptions[O]) => {
    const newFormOptions = { ...formOptions, [option]: value };
    setFormOptions(newFormOptions);
  };

  const handlePasswordTypeChange = (type: string) => {
    const isPassphrase = type === "passphrase";
    updateFormOptions("passphrase", isPassphrase);
    saveOption("passphrase", isPassphrase);
  };

  const handleFieldChange = <O extends keyof PassGenOptions>(field: O, errorMessage?: string) => {
    return async (value: PassGenOptions[O]) => {
      updateFormOptions(field, value);

      if (isValidFieldValue(field, value)) {
        validationToastRef.current?.hide();
        saveOption(field, value);
      } else if (errorMessage) {
        validationToastRef.current = await showToast(Toast.Style.Failure, errorMessage);
      }
    };
  };

  const passwordType: PasswordType = formOptions?.passphrase ? "passphrase" : "password";

  return (
    <>
      <Form.Dropdown id="type" title="Type" value={passwordType} onChange={handlePasswordTypeChange} autoFocus>
        {Object.keys(PASSWORD_OPTIONS_MAP).map((key) => (
          <Form.Dropdown.Item key={key} value={key} title={capitalise(key)} />
        ))}
      </Form.Dropdown>
      {Object.typedEntries(PASSWORD_OPTIONS_MAP[passwordType]).map(
        ([optionType, optionField]: PasswordOptionsToFieldEntries) => (
          <OptionField
            key={optionType}
            option={optionType}
            field={optionField}
            currentOptions={formOptions}
            handleFieldChange={handleFieldChange(optionType, optionField.errorMessage)}
          />
        )
      )}
    </>
  );
}

async function clearStorage() {
  for (const key of Object.values(LOCAL_STORAGE_KEY)) {
    await LocalStorage.removeItem(key);
  }
}

function isValidFieldValue<O extends keyof PassGenOptions>(field: O, value: PassGenOptions[O]) {
  if (field === "length") return !isNaN(Number(value)) && Number(value) >= 5 && Number(value) <= 128;
  if (field === "separator") return (value as string).length === 1;
  if (field === "words") return !isNaN(Number(value)) && Number(value) >= 3 && Number(value) <= 20;
  return true;
}

type OptionFieldProps = {
  field: PasswordOptionField;
  option: keyof PassGenOptions;
  currentOptions: PassGenOptions | undefined;
  handleFieldChange: (value: PassGenOptions[keyof PassGenOptions]) => Promise<void>;
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
