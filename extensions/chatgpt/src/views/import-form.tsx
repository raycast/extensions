import { ActionPanel, Form, Action, Icon, useNavigation } from "@raycast/api";
import { showToast, Toast } from "@raycast/api";

export const ImportForm = (props: { moduleName: string; onSubmit: (file: string) => Promise<boolean> }) => {
  const { pop } = useNavigation();
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={`Import ${props.moduleName}`}
            icon={Icon.Download}
            onSubmit={async (values: { files: string[] }) => {
              const file = values.files[0];
              if (!file) {
                showToast({
                  title: `No file selected`,
                  message: `Please select a file to import ${props.moduleName}`,
                  style: Toast.Style.Failure,
                });
                return;
              }
              try {
                if (await props.onSubmit(file)) pop();
              } catch (error) {
                await showToast({ title: "Import failed", message: String(error), style: Toast.Style.Failure });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker id="files" allowMultipleSelection={false} />
    </Form>
  );
};
