import { Form, Detail } from "@raycast/api";
import useOneTimePasswordHistoryWarning from "~/utils/hooks/useOneTimePasswordHistoryWarning";
import usePasswordGenerator, { UsePasswordGeneratorResult } from "~/utils/hooks/usePasswordGenerator";
import { PasswordGeneratorOptions } from "~/types/passwords";
import FormActionPanel from "~/components/generatePassword/ActionPanel";
import { BitwardenProvider } from "~/context/bitwarden";
import RootErrorBoundary from "~/components/RootErrorBoundary";
import { useForm } from "@raycast/utils";
import { useEffect } from "react";
import { useCliVersion } from "~/utils/hooks/useCliVersion";
import { CustomValidations, stringifyBooleanItemProps } from "~/utils/form";

const FormSpace = () => <Form.Description text="" />;

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

function GeneratePasswordFormContent({ generator }: { generator: UsePasswordGeneratorResult }) {
  const { options, password, isGenerating, regeneratePassword } = generator;

  const cliVersion = useCliVersion();
  const { itemProps, values, handleSubmit } = useForm<PasswordGeneratorOptions>({
    onSubmit: (values) => regeneratePassword(values),
    initialValues: options,
    validation: {
      length: CustomValidations.NumberBetween(5, 128),
      words: CustomValidations.NumberBetween(3, 20),
      separator: CustomValidations.OneCharacter,
      minNumber: CustomValidations.NumberBetween(0, 9),
      minSpecial: CustomValidations.NumberBetween(0, 9),
    },
  });

  // regenerate password when options change
  useEffect(() => void handleSubmit(values), [values]);

  useOneTimePasswordHistoryWarning();

  return (
    <Form
      isLoading={isGenerating}
      actions={<FormActionPanel password={password} regeneratePassword={regeneratePassword} />}
    >
      <Form.Description title="🔑  Password" text={password ?? "Generating..."} />
      <FormSpace />
      <Form.Separator />
      <Form.Dropdown
        {...stringifyBooleanItemProps(itemProps.passphrase, "passphrase", "password")}
        title="Type"
        autoFocus
      >
        <Form.Dropdown.Item value="password" title="Password" />
        <Form.Dropdown.Item value="passphrase" title="Passphrase" />
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
          {values.number && cliVersion >= 2023.9 && (
            <Form.TextField {...itemProps.minNumber} title="Minimum numbers" placeholder="1" />
          )}
          <Form.Checkbox {...itemProps.special} title="Special characters" label="!@#$%^&*()_+-=[]{}|;:,./<>?" />
          {values.special && cliVersion >= 2023.9 && (
            <Form.TextField {...itemProps.minSpecial} title="Minimum special" placeholder="1" />
          )}
        </>
      )}
    </Form>
  );
}

export default GeneratePasswordCommand;
