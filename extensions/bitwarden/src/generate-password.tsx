import { ActionPanel, Icon, Action, Form, LocalStorage, Detail } from "@raycast/api";
import { TroubleshootingGuide } from "~/components/TroubleshootingGuide";
import { capitalize } from "~/utils/strings";
import useOneTimePasswordHistoryWarning from "~/utils/hooks/useOneTimePasswordHistoryWarning";
import { usePasswordGenerator } from "~/utils/hooks/usePasswordGenerator";
import {
  PasswordGeneratorOptions as PassGenOptions,
  PasswordOptionsToFieldEntries,
  PasswordType,
} from "~/types/passwords";
import { PASSWORD_OPTIONS_MAP } from "~/constants/passwords";
import { LOCAL_STORAGE_KEY } from "~/constants/storage";
import { Bitwarden } from "~/api/bitwarden";
import { objectEntries } from "~/utils/objects";
import OptionField from "~/components/GeneratePassword/OptionField";

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
          <Form.Dropdown.Item key={key} value={key} title={capitalize(key)} />
        ))}
      </Form.Dropdown>
      {objectEntries(PASSWORD_OPTIONS_MAP[passwordType]).map(
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

async function clearStorage() {
  for (const key of Object.values(LOCAL_STORAGE_KEY)) {
    await LocalStorage.removeItem(key);
  }
}

export default GeneratePassword;
