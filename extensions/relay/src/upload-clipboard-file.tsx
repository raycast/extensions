import { Action, ActionPanel, Clipboard, Grid, Toast, getPreferenceValues, showHUD, showToast } from "@raycast/api";
import { execFile } from "node:child_process";
import { extname } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { useEffect, useState } from "react";

const execFileAsync = promisify(execFile);

/**
 * Collapse a remote path into one shell word. Only a shell-safe tilde prefix
 * stays unquoted; otherwise the whole path is treated literally.
 */
export function quoteRemotePath(path: string) {
  const tildePrefix = path.match(/^~(?:[A-Za-z0-9._-]+)?(?:\/|$)/)?.[0] ?? "";
  const literal = path.slice(tildePrefix.length);

  if (!literal) {
    return tildePrefix;
  }

  return `${tildePrefix}'${literal.replace(/'/g, `'\\''`)}'`;
}

function getErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("Permission denied (publickey")) {
    return "SSH key authentication failed. Check that the host works in Terminal.";
  }
  if (message.includes("Could not resolve hostname")) {
    return "SSH host not found. Check the SSH Host preference.";
  }
  if (message.includes("Connection refused") || message.includes("timed out")) {
    return "Could not connect to the SSH host.";
  }
  if (message.includes("Permission denied")) {
    return "The remote directory is not writable by your SSH user.";
  }

  return message;
}

export async function uploadFile(localPath: string) {
  const { remoteHost, remoteDirectory } = getPreferenceValues<Preferences.UploadClipboardFile>();
  const filename = `clipboard-${Date.now()}${extname(localPath)}`;
  const directory = remoteDirectory === "/" ? "/" : remoteDirectory.replace(/\/$/, "");
  const remotePath = directory === "/" ? `/${filename}` : `${directory}/${filename}`;
  const toast = await showToast({ style: Toast.Style.Animated, title: "Uploading file…" });

  try {
    await execFileAsync("/usr/bin/ssh", [remoteHost, "mkdir", "-p", quoteRemotePath(directory)]);
    await execFileAsync("/usr/bin/scp", [localPath, `${remoteHost}:${quoteRemotePath(remotePath)}`]);
    await Clipboard.copy(remotePath);
    toast.hide();
    await showHUD("Uploaded — remote path copied");
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Upload failed";
    toast.message = getErrorMessage(error);
  }
}

export default function Command() {
  const [clipboardFiles, setClipboardFiles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadClipboardFiles() {
      const files: string[] = [];

      for (let offset = 0; offset < 5; offset++) {
        const item = await Clipboard.read({ offset });
        if (item.file) {
          files.push(fileURLToPath(item.file));
        }
      }

      setClipboardFiles(files);
      setIsLoading(false);
    }

    loadClipboardFiles().catch(() => setIsLoading(false));
  }, []);

  return (
    <Grid isLoading={isLoading} searchBarPlaceholder="Search recent clipboard files…">
      {clipboardFiles.length === 0 && !isLoading ? (
        <Grid.EmptyView title="No Recent Clipboard Files" description="Copy a file, then reopen this command." />
      ) : null}
      {clipboardFiles.map((file) => (
        <Grid.Item
          key={file}
          title={file.split("/").pop()}
          content={{ source: file }}
          actions={
            <ActionPanel>
              <Action title="Upload File" onAction={() => uploadFile(file)} />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
