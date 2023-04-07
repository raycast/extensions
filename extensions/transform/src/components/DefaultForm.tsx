import { Action, ActionPanel, Form } from "@raycast/api";
import { useForm } from "../lib/use-form";

type DefaultFormProps = ReturnType<typeof useForm> & {
  actions?: React.ReactNode;
  options?: React.ReactNode;
  output?: React.ReactNode;
  input?: React.ReactNode;
};

export function DefaultForm({
  inputProps,
  outputProps,
  actions: Actions,
  options: Options,
  output: Output,
  input: Input,
}: DefaultFormProps) {
  return (
    <Form
      actions={
        Actions || (
          <ActionPanel>
            <Action.CopyToClipboard content={outputProps.value} />
            <Action.Paste content={outputProps.value} />
          </ActionPanel>
        )
      }
    >
      {Input ? Input : <Form.TextArea {...inputProps} />}
      {Options}
      {Output ? Output : <Form.TextArea {...outputProps} />}
    </Form>
  );
}
