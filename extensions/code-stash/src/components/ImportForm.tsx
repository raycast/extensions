import { Form, Action, ActionPanel, useNavigation } from "@raycast/api";

type Props = {
  onImport: (files: string[]) => void;
};

function ImportForm({ onImport }: Props) {
  const { pop } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Import"
            onSubmit={async (values: { files: string[] }) => {
              await onImport(values.files);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="files"
        title="Files/Folders"
        allowMultipleSelection={true}
        canChooseDirectories
        canChooseFiles={true}
        info="Upload all code stashes at once by selecting a directory"
      />
    </Form>
  );
}

export default ImportForm;
