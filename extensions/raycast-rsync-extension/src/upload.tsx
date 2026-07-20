import {
  List,
  ActionPanel,
  Action,
  Form,
  showToast,
  Toast,
  getSelectedFinderItems,
  popToRoot,
} from "@raycast/api";
import React, { useState, useEffect } from "react";
import { parseSSHConfig } from "./utils/sshConfig";
import { executeRsync } from "./utils/rsync";
import {
  validateLocalPath,
  validateRemotePath,
  validateHostConfig,
} from "./utils/validation";
import {
  SSHHostConfig,
  TransferDirection,
  TransferOptions,
  RsyncOptions,
} from "./types/server";
import { getRsyncPreferences } from "./utils/preferences";

/**
 * Main upload command component
 * Displays list of SSH hosts from config file
 */
export default function Command() {
  const [hosts, setHosts] = useState<SSHHostConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHosts();
  }, []);

  async function loadHosts() {
    try {
      const parsedHosts = parseSSHConfig();

      if (parsedHosts.length === 0) {
        const errorMsg = "No host entries found in SSH config file";
        setError(errorMsg);
        console.warn("SSH config parsed but no hosts found");
      } else {
        setHosts(parsedHosts);
        console.log(`Loaded ${parsedHosts.length} SSH host(s)`);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to parse SSH config";
      console.error("Error loading SSH hosts:", err);
      setError(errorMessage);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error Loading SSH Config",
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (error) {
    return (
      <List>
        <List.EmptyView title="Error Loading SSH Config" description={error} />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search hosts...">
      {hosts.map((host: SSHHostConfig) => (
        <List.Item
          key={host.host}
          title={host.host}
          subtitle={host.hostName}
          accessories={[
            { text: host.user ? `User: ${host.user}` : "" },
            { text: host.port ? `Port: ${host.port}` : "" },
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Select Files to Upload"
                target={<FileSelectionView hostConfig={host} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

/**
 * File selection view
 * Allows user to select local files to upload
 */
function FileSelectionView({ hostConfig }: { hostConfig: SSHHostConfig }) {
  const [selectedPath, setSelectedPath] = useState<string>("");
  const [isSelecting, setIsSelecting] = useState(false);

  async function selectFiles() {
    setIsSelecting(true);
    try {
      // Try to get selected Finder items first
      const finderItems = await getSelectedFinderItems();

      if (finderItems.length > 0) {
        // Use the first selected item
        setSelectedPath(finderItems[0].path);
        console.log("Selected file from Finder:", finderItems[0].path);
      } else {
        // No items selected, fall back to manual entry
        setSelectedPath(""); // Reset and show form
      }
    } catch (err) {
      // Check if error is about Finder not being frontmost
      const errorMessage =
        err instanceof Error ? err.message : "Failed to select files";

      if (errorMessage.includes("Finder isn't the frontmost application")) {
        // Silently fall back to manual entry - this is expected behavior
        // when user opens the extension directly without selecting files in Finder first
        console.log("Finder not frontmost, falling back to manual path entry");
        setSelectedPath(""); // Show form for manual entry
      } else {
        // For other errors, log and show notification
        console.error("Error selecting files:", err);
        await showToast({
          style: Toast.Style.Failure,
          title: "File Selection Error",
          message: errorMessage,
        });
      }
    } finally {
      setIsSelecting(false);
    }
  }

  useEffect(() => {
    selectFiles();
  }, []);

  return (
    <Form
      isLoading={isSelecting}
      actions={
        <ActionPanel>
          <Action.Push
            title="Continue"
            target={
              <RemotePathForm
                hostConfig={hostConfig}
                localPath={selectedPath}
              />
            }
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="localPath"
        title="Local Path"
        placeholder="/path/to/local/file"
        value={selectedPath}
        onChange={setSelectedPath}
        info="Select files or folders in Finder before opening this extension, or manually enter the path to the file or directory you want to upload"
      />
      <Form.Description
        title="Host Details"
        text={`Uploading to: ${hostConfig.host}${hostConfig.hostName ? ` (${hostConfig.hostName})` : ""}`}
      />
      {hostConfig.user && (
        <Form.Description title="User" text={hostConfig.user} />
      )}
      {hostConfig.port && (
        <Form.Description title="Port" text={hostConfig.port.toString()} />
      )}
      {hostConfig.identityFile && (
        <Form.Description
          title="Identity File"
          text={hostConfig.identityFile}
        />
      )}
    </Form>
  );
}

/**
 * Remote path input form
 * Allows user to specify destination path on remote server
 */
function RemotePathForm({
  hostConfig,
  localPath,
}: {
  hostConfig: SSHHostConfig;
  localPath: string;
}) {
  const [remotePath, setRemotePath] = useState<string>("");
  const [remotePathError, setRemotePathError] = useState<string | undefined>();

  // Initialize rsync options with global preferences
  const defaultRsyncOptions = getRsyncPreferences();
  const [humanReadable, setHumanReadable] = useState<boolean>(
    defaultRsyncOptions.humanReadable ?? false,
  );
  const [progress, setProgress] = useState<boolean>(
    defaultRsyncOptions.progress ?? false,
  );
  const [deleteExtra, setDeleteExtra] = useState<boolean>(
    defaultRsyncOptions.delete ?? false,
  );

  async function handleSubmit(values: {
    remotePath: string;
    humanReadable: boolean;
    progress: boolean;
    deleteExtra: boolean;
  }) {
    const remotePathValue = values.remotePath.trim();

    // Validate local path
    const localValidation = validateLocalPath(localPath);
    if (!localValidation.valid) {
      console.error("Local path validation failed:", localValidation.error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid Local Path",
        message:
          localValidation.error ||
          "The specified local file or directory does not exist",
      });
      return;
    }

    // Validate remote path
    const remoteValidation = validateRemotePath(remotePathValue);
    if (!remoteValidation.valid) {
      console.error("Remote path validation failed:", remoteValidation.error);
      setRemotePathError(remoteValidation.error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid Remote Path",
        message: remoteValidation.error || "The remote path format is invalid",
      });
      return;
    }

    // Validate host config
    const hostValidation = validateHostConfig(hostConfig);
    if (!hostValidation.valid) {
      console.error("Host config validation failed:", hostValidation.error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid Host Configuration",
        message:
          hostValidation.error ||
          "The host configuration is incomplete or invalid",
      });
      return;
    }

    // Execute transfer using form values
    await executeTransfer(hostConfig, localPath, remotePathValue, {
      humanReadable: values.humanReadable,
      progress: values.progress,
      delete: values.deleteExtra,
    });
  }

  async function executeTransfer(
    hostConfig: SSHHostConfig,
    localPath: string,
    remotePath: string,
    rsyncOptions: RsyncOptions,
  ) {
    // Show initial progress toast
    await showToast({
      style: Toast.Style.Animated,
      title: "Transferring files...",
      message: `Uploading to ${hostConfig.host}`,
    });

    console.log("Starting upload:", {
      host: hostConfig.host,
      localPath,
      remotePath,
    });

    try {
      const options: TransferOptions = {
        hostConfig,
        localPath,
        remotePath,
        direction: TransferDirection.UPLOAD,
        rsyncOptions,
      };

      // Progress callback to update toast in real-time
      const progressCallback = async (progressMessage: string) => {
        await showToast({
          style: Toast.Style.Animated,
          title: "Transferring files...",
          message: progressMessage,
        });
      };

      const result = await executeRsync(options, progressCallback);

      if (result.success) {
        console.log("Upload completed successfully");
        // Show formatted rsync output message (includes file sizes and progress if flags enabled)
        await showToast({
          style: Toast.Style.Success,
          title: "Upload Successful",
          message: result.message,
        });
        // Log full output for debugging
        if (result.stdout) {
          console.log("Rsync output:", result.stdout);
        }
        // Close the extension after successful upload
        await popToRoot();
      } else {
        console.error("Upload failed:", result.message);
        await showToast({
          style: Toast.Style.Failure,
          title: "Upload Failed",
          message: result.message,
        });
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      console.error("Upload error:", err);
      await showToast({
        style: Toast.Style.Failure,
        title: "Upload Failed",
        message: errorMessage,
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Upload" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="remotePath"
        title="Remote Path"
        placeholder="/path/to/remote/destination"
        value={remotePath}
        onChange={(value: string) => {
          setRemotePath(value);
          setRemotePathError(undefined);
        }}
        error={remotePathError}
        info="Enter the destination path on the remote server"
      />
      <Form.Description title="Local Path" text={localPath} />
      <Form.Description
        title="Host"
        text={`${hostConfig.host}${hostConfig.hostName ? ` (${hostConfig.hostName})` : ""}`}
      />
      <Form.Separator />
      <Form.Description
        title="Rsync Options"
        text="Configure options for this transfer"
      />
      <Form.Checkbox
        id="humanReadable"
        label="Human-readable file sizes (-h)"
        value={humanReadable}
        onChange={setHumanReadable}
        info="Display file sizes in human-readable format (e.g., 1.5M, 500K)"
      />
      <Form.Checkbox
        id="progress"
        label="Show progress (-P)"
        value={progress}
        onChange={setProgress}
        info="Display progress information and support partial transfers"
      />
      <Form.Checkbox
        id="deleteExtra"
        label="Delete extraneous files (--delete)"
        value={deleteExtra}
        onChange={setDeleteExtra}
        info="Delete files in destination that don't exist in source (use with caution)"
      />
    </Form>
  );
}
