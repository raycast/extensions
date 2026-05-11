import type { LaunchProps } from "@raycast/api";
import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";

import { PasswordResult } from "@/components/PasswordResult";

interface SignUpFormValues {
  password: string;
}

export default function Command(props: LaunchProps<{ arguments: Arguments.CheckPasswordStrength }>) {
  const { password } = props.arguments;
  const { push } = useNavigation();

  const { handleSubmit, itemProps } = useForm<SignUpFormValues>({
    onSubmit({ password }) {
      push(<PasswordResult password={password} />);
    },
    validation: {
      password: FormValidation.Required,
    },
  });

  if (password) {
    return <PasswordResult password={password} />;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
          <ActionPanel.Section>
            <Action.CreateQuicklink title="Create Quick Link" quicklink={{ link: "pssword" }} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.PasswordField title="Test Password" {...itemProps.password} />
      <Form.Description text="Input your password. The extension will create a SHA-1 hash and check the hash against an online database (https://haveibeenpwned.com/Passwords) to see if it has been compromised." />
    </Form>
  );
}
