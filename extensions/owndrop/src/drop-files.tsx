import { useEffect, useState } from "react";
import { Action, ActionPanel, Form, getSelectedFinderItems, popToRoot, showHUD, showToast, Toast } from "@raycast/api";
import { dropFileFromPath } from "./api";

export default function DropFilesCommand() {
  const [files, setFiles] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Best-effort prefill on macOS when Finder items are selected; safely skipped on Windows.
  useEffect(() => {
    if (process.platform !== "darwin") return;
    getSelectedFinderItems()
      .then((selected) => {
        if (selected.length > 0) {
          setFiles(selected.map((s) => s.path));
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (values: { files: string[] }) => {
    if (!values.files || values.files.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Select at least one file",
      });
      return;
    }

    setSubmitting(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Uploading ${values.files.length} file(s)…`,
    });
    try {
      for (let i = 0; i < values.files.length; i++) {
        toast.title = `Uploading ${i + 1}/${values.files.length}…`;
        await dropFileFromPath(values.files[i]!);
      }
      toast.hide();
      await showHUD(`Dropped ${values.files.length} file${values.files.length > 1 ? "s" : ""} to OwnDrop`);
      await popToRoot();
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Upload failed";
      toast.message = (err as Error).message;
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Form
      isLoading={submitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Drop Files" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="files"
        title="Files"
        allowMultipleSelection
        canChooseFiles
        canChooseDirectories={false}
        value={files}
        onChange={setFiles}
      />
    </Form>
  );
}
