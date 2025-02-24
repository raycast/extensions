import { ActionPanel, Form, Action, Detail } from "@raycast/api";
import { useImagesForm } from "./hooks/use-image-form";

export default function Command() {
  const { handleSubmit, markdown, fields } = useImagesForm();

  return (
    <>
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Run" onSubmit={handleSubmit} />
          </ActionPanel>
        }
      >
        <Form.FilePicker
          title="actual"
          allowMultipleSelection={false}
          info="Only files with the extensions .png, .jpeg, .jpg, and .gif are supported."
          {...fields.actual}
        />
        <Form.FilePicker
          title="expected"
          allowMultipleSelection={false}
          info="Only files with the extensions .png, .jpeg, .jpg, and .gif are supported."
          {...fields.expected}
        />
      </Form>
      {markdown && <Detail markdown={markdown} />}
    </>
  );
}
