import { ActionPanel, Form, Action, Toast, showToast, Icon } from "@raycast/api";
import { useState } from "react";
import { validMediaTypes, GetToken, createMediaItem } from "./utils";
import { withGoogleAuth } from "./components/withGoogleAuth";

const GoogleUpload: React.FunctionComponent = () => {
  const [files, setFiles] = useState<string[]>([]);
  const [error, setError] = useState<string | undefined>();

  const uploadFiles = async (files: Array<any>) => {
    if (!files.length) {
      setError("No files selected");
      return;
    }

    if (files.length > 50) {
      setError("Max 50 files");
      return;
    }

    const validFiles = files.filter((file) => validMediaTypes.includes(file.split(".").pop()!));

    if (!validFiles.length) {
      setError("No valid files selected");
      return;
    }
    await showToast(Toast.Style.Animated, "Uploading files...");
    const tokens = await Promise.all(validFiles.map(async (file) => await GetToken(file)));

    if (!tokens) {
      setError("Error uploading files");
      showToast(Toast.Style.Failure, "Error uploading files");
      return;
    }

    await createMediaItem(tokens as any);
    await showToast(Toast.Style.Success, "Files uploaded successfully");

    setFiles([]);
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={({ files }) => uploadFiles(files)} icon={Icon.Upload} />
        </ActionPanel>
      }
    >
      <Form.FilePicker id="files" value={files} onChange={setFiles} error={error} autoFocus info="Max 50 files" />
      <Form.Separator />
    </Form>
  );
};

export default function Command() {
  return withGoogleAuth(<GoogleUpload />);
}
