import { Form, Detail } from "@raycast/api";
import useOneTimePasswordHistoryWarning from "~/utils/hooks/useOneTimePasswordHistoryWarning";
import usePasswordGenerator, { UsePasswordGeneratorResult } from "~/utils/hooks/usePasswordGenerator";
import { PasswordGeneratorOptions, PasswordType } from "~/types/passwords";
import FormActionPanel from "~/components/generatePassword/ActionPanel";
import { BitwardenProvider } from "~/context/bitwarden";
import RootErrorBoundary from "~/components/RootErrorBoundary";
import { useCliVersion } from "~/utils/hooks/useCliVersion";
import { CustomValidations, stringifyBooleanItemProps, useOnChangeForm } from "~/utils/form";
import { capitalize } from "~/utils/strings";

const GeneratePasswordCommand = () => (
  <RootErrorBoundary>
    <BitwardenProvider>
      <GeneratePasswordForm />
    </BitwardenProvider>
  </RootErrorBoundary>
);

function GeneratePasswordForm() {
  const generator = usePasswordGenerator();

  if (!generator.options) return <Detail isLoading />;
  return <GeneratePasswordFormContent generator={generator} />;
}

const passwordTypeOptions: PasswordType[] = ["password", "passphrase"];

function GeneratePasswordFormContent({ generator }: { generator: UsePasswordGeneratorResult }) {
  const { options, password, isGenerating, regeneratePassword } = generator;

  const cliVersion = useCliVersion();
  const form = useOnChangeForm<PasswordGeneratorOptions>({
    onChange: regeneratePassword,
    initialValues: options,
    validation: {
      length: CustomValidations.NumberStringBetween(5, 128),
      words: CustomValidations.NumberStringBetween(3, 20),
      separator: CustomValidations.OneCharacter,
      minNumber: CustomValidations.NumberStringBetween(0, 9),
      minSpecial: CustomValidations.NumberStringBetween(0, 9),
    },
  });

  const { values, itemProps } = form;

  useOneTimePasswordHistoryWarning();

  return (
    <Form
      isLoading={isGenerating}
      actions={<FormActionPanel password={password} regeneratePassword={regeneratePassword} />}
    >
      <Form.Description title="🔑" text={password ?? "Generating..."} />
      <Form.Separator />
      <Form.Dropdown
        {...stringifyBooleanItemProps<PasswordType>(itemProps.passphrase, "passphrase", "password")}
        title="Type"
        autoFocus
      >
        {passwordTypeOptions.map((type) => (
          <Form.Dropdown.Item key={type} value={type} title={capitalize(type)} />
        ))}
      </Form.Dropdown>
      {values.passphrase ? (
        <>
          <Form.TextField {...itemProps.words} title="Number of words" placeholder="3 - 20" />
          <Form.TextField {...itemProps.separator} title="Word separator" placeholder="this-is-a-passphrase" />
          <Form.Checkbox {...itemProps.capitalize} title="Capitalize" label="This-Is-A-Passphrase" />
          <Form.Checkbox {...itemProps.includeNumber} title="Include number" label="This2-Is-A-Passphrase" />
        </>
      ) : (
        <>
          <Form.TextField {...itemProps.length} title="Length of the password" placeholder="5 - 128" />
          <Form.Checkbox {...itemProps.uppercase} title="Uppercase characters" label="ABCDEFGHIJLMNOPQRSTUVWXYZ" />
          <Form.Checkbox {...itemProps.lowercase} title="Lowercase characters" label="abcdefghijklmnopqrstuvwxyz" />
          <Form.Checkbox {...itemProps.number} title="Numeric characters" label="0123456789" />
          {cliVersion >= 2023.9 && values.number && (
            <Form.TextField {...itemProps.minNumber} title="Minimum numbers" placeholder="1" />
          )}
          <Form.Checkbox {...itemProps.special} title="Special characters" label="!@#$%^&*()_+-=[]{}|;:,./<>?" />
          {cliVersion >= 2023.9 && values.special && (
            <Form.TextField {...itemProps.minSpecial} title="Minimum special" placeholder="1" />
          )}
        </>
      )}
    </Form>
  );
}

export default GeneratePasswordCommand;
