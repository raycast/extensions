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
          title="Actual"
          allowMultipleSelection={false}
          info="Only files with the extensions .png, .jpeg, .jpg, and .gif are supported."
          {...fields.actual}
        />
        <Form.FilePicker
          title="Expected"
          allowMultipleSelection={false}
          info="Only files with the extensions .png, .jpeg, .jpg, and .gif are supported."
          {...fields.expected}
        />
        <Form.Separator />
        <Form.Dropdown title="Threshold" {...fields.threshold}>
          <Form.Dropdown.Item value="0" title="0" />
          <Form.Dropdown.Item value="0.1" title="0.1" />
          <Form.Dropdown.Item value="0.2" title="0.2" />
          <Form.Dropdown.Item value="0.3" title="0.3" />
          <Form.Dropdown.Item value="0.4" title="0.4" />
          <Form.Dropdown.Item value="0.5" title="0.5" />
          <Form.Dropdown.Item value="0.6" title="0.6" />
          <Form.Dropdown.Item value="0.7" title="0.7" />
          <Form.Dropdown.Item value="0.8" title="0.8" />
          <Form.Dropdown.Item value="0.9" title="0.9" />
          <Form.Dropdown.Item value="1" title="1" />
        </Form.Dropdown>
      </Form>
      {markdown && <Detail markdown={markdown} />}
    </>
  );
}
