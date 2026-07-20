import { Action, ActionPanel, Form } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";

export type FormValues = {
  folderId: string;
  folderPath: string[];
  extensions: string;
};

type FolderFormProps = {
  submitText: string;
  defaultFolderId?: string;
  defaultFolderPath?: string[];
  defaultFolderExtensions?: string;
  handleOnSubmit: (values: FormValues) => void;
};

export const FolderForm = ({
  submitText,
  handleOnSubmit,
  defaultFolderId,
  defaultFolderPath,
  defaultFolderExtensions,
}: FolderFormProps) => {
  const { handleSubmit, itemProps } = useForm<FormValues>({
    onSubmit: (values) => {
      handleOnSubmit(values);
    },
    initialValues: {
      folderId: defaultFolderId ?? "",
      folderPath: defaultFolderPath ?? [],
      extensions: defaultFolderExtensions ?? "",
    },
    validation: {
      folderId: FormValidation.Required,
      folderPath: FormValidation.Required,
      extensions: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={submitText} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Folder Identifier" placeholder="e.g. Documents" {...itemProps.folderId} />
      <Form.FilePicker
        title="Folder Path"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
        {...itemProps.folderPath}
      />
      <Form.TextField
        title="Extensions"
        placeholder="e.g. png, jpeg, pdf"
        info="Add extensions separated by a comma"
        {...itemProps.extensions}
      />
    </Form>
  );
};
