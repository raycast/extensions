import { Form, ActionPanel, Action, useNavigation, showToast, Toast } from "@raycast/api";
import { homedir } from "os";
import { join, dirname } from "path";
import { ReactNode, useState } from "react";
import { openSaveDialog } from "./NativeFilePicker";
import { ensureDirectoryExists } from "./FileUtils";
import { Icon } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

export interface FileDownloadProps {
  onDownload: (downloadPath: string) => Promise<void>;
  fileName: string;
  title?: string;
  defaultLocation?: string;
  children?: ReactNode;
}

export function FileDownloader({
  onDownload,
  fileName,
  title = "Download File",
  defaultLocation = join(homedir(), "Downloads"),
  children,
}: FileDownloadProps) {
  const { pop } = useNavigation();
  const [downloadPath, setDownloadPath] = useState<string>(join(defaultLocation, fileName));

  const handleBrowse = async () => {
    const savePath = await openSaveDialog({
      prompt: "Save file as",
      defaultName: fileName,
      defaultLocation: defaultLocation,
    });

    if (savePath) {
      setDownloadPath(savePath);
    }
  };

  return (
    <Form
      navigationTitle={title}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Download"
            icon={Icon.Download}
            shortcut={{ modifiers: ["cmd"], key: "enter" }}
            onSubmit={async (values) => {
              const path = values.downloadPath || downloadPath;

              if (!path) {
                await showFailureToast({
                  title: "Invalid Path",
                  message: "Please specify a valid download path",
                });
                return;
              }

              try {
                const dirPath = dirname(path);
                await ensureDirectoryExists(dirPath);
              } catch (error) {
                await showFailureToast({
                  title: "Directory Error",
                  message: "Could not create or access the download directory",
                });
                return;
              }

              const downloadingToast = await showToast({
                style: Toast.Style.Animated,
                title: "Downloading...",
                message: `To: ${path}`,
              });

              try {
                await onDownload(path);
                downloadingToast.hide();
                showToast({
                  style: Toast.Style.Success,
                  title: "Download complete",
                  message: path,
                });
                pop();
              } catch (error: unknown) {
                downloadingToast.hide();
                await showFailureToast({
                  title: "Download failed",
                  message: error instanceof Error ? error.message : String(error),
                });
              }
            }}
          />
          <Action
            title="Browse…"
            icon={Icon.Finder}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
            onAction={handleBrowse}
          />
          <Action title="Cancel" icon={Icon.XmarkCircle} onAction={pop} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="downloadPath"
        title="Download Location"
        placeholder={join(defaultLocation, fileName)}
        value={downloadPath}
        onChange={setDownloadPath}
        info="Enter the full path where you want to save the file or click 'Browse...' to select a location using the native save dialog."
        autoFocus
      />
      <Form.Description
        title="Options"
        text="You can either enter a download path or click 'Browse...' to select a location using the native save dialog."
      />
      <Form.Description title="File Information" text={`Filename: ${fileName}`} />
      {children}
    </Form>
  );
}

export function CloudStorageDownloader({
  onDownload,
  fileName,
  bucketName,
  objectName,
  title = "Download Object",
}: {
  onDownload: (downloadPath: string) => Promise<void>;
  fileName: string;
  bucketName: string;
  objectName: string;
  title?: string;
}) {
  return (
    <FileDownloader onDownload={onDownload} fileName={fileName} title={title}>
      <Form.Description title="Source" text={`Bucket: ${bucketName}\nObject: ${objectName}`} />
    </FileDownloader>
  );
}
