import { Form, ActionPanel, Action, showToast, Toast, useNavigation, Icon } from "@raycast/api";
import { useState } from "react";
import { sendFiles } from "./utils/localsend";
import SendToDevice from "./send-to-device";

interface FormValues {
  folder: string[];
}

export default function Command() {
  const { push } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (values: FormValues) => {
    if (!values.folder || values.folder.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No folder selected",
        message: "Please select a folder",
      });
      return;
    }

    setIsLoading(true);

    try {
      const fs = await import("node:fs/promises");
      const path = await import("node:path");
      const archiver = await import("archiver");
      const os = await import("node:os");

      const folderPath = values.folder[0];
      const folderName = path.basename(folderPath);
      const tmpDir = os.tmpdir();
      const timestamp = Date.now();
      const zipFileName = `${folderName}-${timestamp}.zip`;
      const zipPath = path.join(tmpDir, zipFileName);

      await showToast({
        style: Toast.Style.Animated,
        title: "Creating archive...",
        message: "Compressing folder contents",
      });

      // Create zip archive
      const output = (await import("node:fs")).createWriteStream(zipPath);
      const archive = archiver.default("zip", {
        zlib: { level: 9 },
      });

      await new Promise<void>((resolve, reject) => {
        output.on("close", () => resolve());
        archive.on("error", (err: Error) => reject(err));

        archive.pipe(output);
        archive.directory(folderPath, false);
        archive.finalize();
      });

      const stats = await fs.stat(zipPath);

      const zipFile = {
        path: zipPath,
        name: zipFileName,
        size: stats.size,
        type: "application/zip",
      };

      await showToast({
        style: Toast.Style.Success,
        title: "Archive created",
        message: `${folderName} compressed`,
      });

      push(<SendToDevice files={[zipFile]} onSend={sendFiles} />);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to compress folder",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Select Device" icon={Icon.Upload} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="folder"
        title="Select Folder"
        allowMultipleSelection={false}
        canChooseDirectories={true}
        canChooseFiles={false}
      />
      <Form.Description text="Select a folder to compress and send as a zip file" />
    </Form>
  );
}
