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
import { useEffect } from "react";
import { DEFAULT_PASSWORD_OPTIONS } from "~/constants/passwords";

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

const passwordTypeOptions: PasswordType[] = ["password", "passphrase"];

type FormProps<T extends Form.Values> = ReturnType<typeof useOnChangeForm<T>>;

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

  usePasswordRulesSideEffects(form);
  useOneTimePasswordHistoryWarning();

  return (
    <Form
      isLoading={isGenerating}
      actions={<FormActionPanel password={password} regeneratePassword={regeneratePassword} />}
    >
      <Form.Description title="🔑" text={password ?? "Generating..."} />
      <FormSpace />
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
          {cliVersion >= 2023.9 && (
            <>
              <Form.TextField {...itemProps.minNumber} title="Minimum numbers" placeholder="1" />
              <Form.Checkbox {...itemProps.special} title="Special characters" label="!@#$%^&*()_+-=[]{}|;:,./<>?" />
              <Form.TextField {...itemProps.minSpecial} title="Minimum special" placeholder="1" />
            </>
          )}
        </>
      )}
    </Form>
  );
}

function usePasswordRulesSideEffects(form: FormProps<PasswordGeneratorOptions>) {
  const { values, setValue } = form;

  useEffect(() => {
    if (!values.number && values.minNumber !== "0") {
      setValue("minNumber", "0");
    } else if (values.number && values.minNumber === "0") {
      setValue("minNumber", DEFAULT_PASSWORD_OPTIONS.minNumber);
    }
  }, [values.number]);

  useEffect(() => {
    if (values.minNumber === "" || Number.isNaN(Number(values.minNumber))) return;
    const number = !!values.minNumber && Number(values.minNumber) > 0;
    if (values.number !== number) setValue("number", number);
  }, [values.minNumber]);

  useEffect(() => {
    if (!values.special && values.minSpecial !== "0") {
      setValue("minSpecial", "0");
    } else if (values.special && values.minSpecial === "0") {
      setValue("minSpecial", DEFAULT_PASSWORD_OPTIONS.minSpecial);
    }
  }, [values.special]);

  useEffect(() => {
    if (values.minSpecial === "" || Number.isNaN(Number(values.minSpecial))) return;
    const special = !!values.minSpecial && Number(values.minSpecial) > 0;
    if (values.special !== special) setValue("special", special);
  }, [values.minSpecial]);
}

export default GeneratePasswordCommand;
