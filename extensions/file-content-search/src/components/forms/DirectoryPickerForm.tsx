import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import type { FC } from "react";

type DirectoryPickerFormProps = {
  path: string;
  onAction: (path: string) => void;
};

export const DirectoryPickerForm: FC<DirectoryPickerFormProps> = ({ path, onAction }) => {
  const { pop } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Select Directory"
            onSubmit={(values: { path: string[] }) => {
              const selectedPaths = values.path;
              if (selectedPaths?.length > 0) {
                onAction(selectedPaths[0]);
                pop();
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="path"
        title="Search Location"
        allowMultipleSelection={false}
        canChooseDirectories={true}
        canChooseFiles={false}
        defaultValue={[path]}
      />
      <Form.Description text="Choose a folder to limit the search scope." />
    </Form>
  );
};
