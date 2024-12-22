import { ActionPanel, Action, Form } from "@raycast/api";
import { useForm } from "@raycast/utils";

interface Credentials {
  appleID: string;
  password: string;
}

export function LoginForm({ submit }: { submit: (credentials: Credentials) => void }) {
  const { handleSubmit, itemProps } = useForm<Credentials>({
    onSubmit(values) {
      submit(values);
    },
    validation: {
      appleID: (value) => {
        if (!value?.trim()) {
          return "Email cannot be empty";
        }
      },
      password: (value) => {
        if (!value?.trim()) {
          return "Password cannot be empty";
        }
      },
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Login" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title=""
        text="Please enter your iCloud credentials. A session will be established after a successful login. Your password will not be stored."
      />
      <Form.TextField title="Email" {...itemProps.appleID} />
      <Form.PasswordField title="Password" {...itemProps.password} />
    </Form>
  );
}
