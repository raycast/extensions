import { Form, ActionPanel, Action } from "@raycast/api";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useUpload } from "./lib/hooks";
import { filePathsToFile } from "./lib/utils";
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

  const handleSubmit = async (values: { files: string[] }) => {
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
      <Form.FilePicker id="files" title="Select file" />
    </Form>
  );
};
