import { Form, Detail } from "@raycast/api";
import { capitalize } from "~/utils/strings";
import useOneTimePasswordHistoryWarning from "~/utils/hooks/useOneTimePasswordHistoryWarning";
import usePasswordGenerator from "~/utils/hooks/usePasswordGenerator";
import { PasswordGeneratorOptions, PasswordOptionsToFieldEntries, PasswordType } from "~/types/passwords";
import { PASSWORD_OPTIONS_MAP } from "~/constants/passwords";
import { objectEntries } from "~/utils/objects";
import FormActionPanel from "~/components/generatePassword/ActionPanel";
import { BitwardenProvider } from "~/context/bitwarden";
import RootErrorBoundary from "~/components/RootErrorBoundary";
import OptionField from "~/components/generatePassword/OptionField";

const FormSpace = () => <Form.Description text="" />;

const GeneratePasswordCommand = () => (
  <RootErrorBoundary>
    <BitwardenProvider>
      <GeneratePasswordComponent />
    </BitwardenProvider>
  </RootErrorBoundary>
);

function GeneratePasswordComponent() {
  const { password, regeneratePassword, isGenerating, options, setOption } = usePasswordGenerator();

  useOneTimePasswordHistoryWarning();

  if (!options) return <Detail isLoading />;

  const handlePasswordTypeChange = (type: string) => setOption("passphrase", type === "passphrase");

  const handleFieldChange = <O extends keyof PasswordGeneratorOptions>(field: O) => {
    return (value: PasswordGeneratorOptions[O]) => {
      setOption(field, value);
    };
  };

  const passwordType: PasswordType = options?.passphrase ? "passphrase" : "password";

  return (
    <Form
      isLoading={isGenerating}
      actions={<FormActionPanel password={password} regeneratePassword={regeneratePassword} />}
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

export default GeneratePasswordCommand;
