import { ActionPanel, Icon, Action, Form, LocalStorage, Detail } from "@raycast/api";
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
import { useState } from "react";

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

  const handlePasswordTypeChange = (type: string) => setOption("passphrase", type === "passphrase");

  const handleFieldChange = <O extends keyof PassGenOptions>(field: O) => {
    return (value: PassGenOptions[O]) => {
      setOption(field, value);
    };
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
            defaultValue={options[optionType]}
            errorMessage={optionField.errorMessage}
            onChange={handleFieldChange(optionType)}
          />
        )
      )}
    </Form>
  );
}

type OptionFieldProps = {
  field: PasswordOptionField;
  option: keyof PassGenOptions;
  defaultValue: PassGenOptions[keyof PassGenOptions];
  onChange: (value: PassGenOptions[keyof PassGenOptions]) => void;
  errorMessage?: string;
};

function OptionField({ option, defaultValue = "", onChange: handleChange, errorMessage, field }: OptionFieldProps) {
  const { hint = "", label, type } = field;
  const [error, setError] = useState<string>();

  const handleTextFieldChange = (value: string) => {
    if (isValidFieldValue(option, value)) {
      handleChange(value);
      setError(undefined);
    } else {
      setError(errorMessage);
    }
  };

  if (type === "boolean") {
    return (
      <Form.Checkbox
        key={option}
        id={option}
        title={label}
        label={hint}
        defaultValue={Boolean(defaultValue)}
        onChange={handleChange}
      />
    );
  }

  return (
    <Form.TextField
      key={option}
      id={option}
      title={label}
      placeholder={hint}
      defaultValue={String(defaultValue)}
      onChange={handleTextFieldChange}
      error={error}
    />
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

export default GeneratePassword;
