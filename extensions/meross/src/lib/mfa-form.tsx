import { Action, ActionPanel, Form } from "@raycast/api";

export function MfaForm(props: { message: string; onSubmit: (code: string) => void }) {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Log in"
            onSubmit={(values: { code: string }) => props.onSubmit(values.code.trim())}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Two-Factor Authentication" text={props.message} />
      <Form.TextField id="code" title="MFA Code" placeholder="123456" autoFocus />
    </Form>
  );
}
