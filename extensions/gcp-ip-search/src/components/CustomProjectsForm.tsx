import { useState } from "react";
import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";

export function CustomProjectsForm({
  initialValue,
  onSave,
}: {
  initialValue: string;
  onSave: (value: string) => Promise<void>;
}) {
  const { pop } = useNavigation();
  const [value, setValue] = useState(initialValue);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Projects"
            onSubmit={async () => {
              await onSave(value);
              await showToast({
                style: Toast.Style.Success,
                title: "Configuration Saved",
              });
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Custom Project List"
        text="Enter GCP Project IDs separated by commas. Only these projects will be searched in Custom mode."
      />
      <Form.TextArea
        id="projects"
        title="Project IDs"
        placeholder="project-id-1, project-id-2, project-id-3"
        value={value}
        onChange={setValue}
      />
    </Form>
  );
}
