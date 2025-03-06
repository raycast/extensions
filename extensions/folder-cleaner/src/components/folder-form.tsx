import { Action, ActionPanel, Form } from "@raycast/api";
import { availableExtensions } from "../utils/availableExtensions";

export type FormValues = {
  folderId: string;
  folderPath: string[];
  extensions: string[];
};

type FolderFormProps = {
  submitText: string;
  defaultFolderId?: string;
  defaultFolderPath?: string[];
  defaultFolderExtenstions?: string[];
  handleSubmit: (values: FormValues) => void;
};

export const FolderForm = ({
  submitText,
  handleSubmit,
  defaultFolderId = "",
  defaultFolderPath = [],
  defaultFolderExtenstions = [],
}: FolderFormProps) => {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={submitText} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="folderId" title="Folder Identifier" defaultValue={defaultFolderId} />
      <Form.FilePicker
        id="folderPath"
        title="Folder Path"
        defaultValue={defaultFolderPath}
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
      />
      <Form.TagPicker id="extensions" title="Extensions" defaultValue={defaultFolderExtenstions}>
        {availableExtensions.map((extension) => (
          <Form.TagPicker.Item key={extension.value} value={extension.value} title={extension.title} />
        ))}
      </Form.TagPicker>
    </Form>
  );
};
