import { Form, Action, ActionPanel } from "@raycast/api";

export const FormComponent = (props: {
  arguments: { format?: string; inputFiles?: string[] | null };
  onSubmit: (params: { inputPaths: string[]; format: string }) => Promise<void>;
}) => {
  const args = props.arguments;
  const format = args.format || "";

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Convert"
            onSubmit={async (values) => {
              await props.onSubmit({
                inputPaths: values.inputPaths as string[],
                format: values.format as string,
              });
            }}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="inputPaths"
        title="Select Files"
        allowMultipleSelection
        defaultValue={props.arguments.inputFiles || []}
      />
      <Form.TextField id="format" title="Output Format" defaultValue={format} />
    </Form>
  );
};
