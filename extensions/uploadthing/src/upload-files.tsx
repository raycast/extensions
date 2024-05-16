import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useUpload } from "./lib/hooks";
import { filePathsToFile, guardInvalidApiKey } from "./lib/utils";
import { FileGrid } from "./lib/file-grid";

const queryClient = new QueryClient();
export default () => {
  return (
    <QueryClientProvider client={queryClient}>
      <Command />
    </QueryClientProvider>
  );
};

const Command = () => {
  const { upload, uploadedFiles } = useUpload();

  const keyCheck = guardInvalidApiKey();
  if (keyCheck) return keyCheck;

  const handleSubmit = async (values: { files: string[] }) => {
    if (values.files.length === 0) {
      showToast(Toast.Style.Failure, "Please select at least one file");
      return;
    }

    const files = await filePathsToFile(values.files);
    upload(files);
  };

  if (uploadedFiles.length > 0) {
    return <FileGrid files={uploadedFiles} />;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker id="files" title="Select Files" />
    </Form>
  );
};
