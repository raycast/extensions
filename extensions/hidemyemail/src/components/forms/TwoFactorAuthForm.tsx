import { ActionPanel, Form, Action } from "@raycast/api";
import { useForm } from "@raycast/utils";

interface Code {
  code: string;
}

export default function TwoFactorAuthForm({
  submit,
  resendCode,
}: {
  submit: (code: string) => Promise<void>;
  resendCode: () => Promise<void>;
}) {
  const { handleSubmit, itemProps } = useForm<Code>({
    onSubmit(values) {
      submit(values.code);
    },
    validation: {
      code: (value) => {
        if (value && !/^\d{6}$/.test(value)) {
          return "Code must be a 6-digit number (no spaces)";
        }
      },
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit Code" onSubmit={handleSubmit} />
          <Action title="Resend Code" onAction={resendCode} shortcut={{ modifiers: ["cmd"], key: "n" }} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="2FA Code"
        placeholder="Enter 6-digit code"
        {...itemProps.code}
        info="You can resend the code using the corresponding action."
        autoFocus={true}
      />
    </Form>
  );
}
