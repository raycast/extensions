import {
  List,
  ActionPanel,
  Action,
  Form,
  showToast,
  Toast,
  popToRoot,
} from "@raycast/api";
import React, { useState, useEffect } from "react";
import { parseSSHConfig } from "./utils/sshConfig";
import { executeRsync } from "./utils/rsync";
import { validateRemotePath, validateHostConfig } from "./utils/validation";
import {
  SSHHostConfig,
  TransferDirection,
  TransferOptions,
  RsyncOptions,
} from "./types/server";
import { getRsyncPreferences } from "./utils/preferences";

/**
 * Main download command component
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
                title="Enter Remote Path"
                target={<RemotePathForm hostConfig={host} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

/**
 * Remote path input form
 * Allows user to specify source path on remote server
 */
function RemotePathForm({ hostConfig }: { hostConfig: SSHHostConfig }) {
  const [remotePath, setRemotePath] = useState<string>("");
  const [remotePathError, setRemotePathError] = useState<string | undefined>();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.Push
            title="Continue"
            target={
              <LocalPathForm hostConfig={hostConfig} remotePath={remotePath} />
            }
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="remotePath"
        title="Remote Path"
        placeholder="/path/to/remote/file"
        value={remotePath}
        onChange={(value: string) => {
          setRemotePath(value);
          setRemotePathError(undefined);
        }}
        error={remotePathError}
        info="Enter the path to the file or directory on the remote server"
      />
      <Form.Description
        title="Host Details"
        text={`Downloading from: ${hostConfig.host}${hostConfig.hostName ? ` (${hostConfig.hostName})` : ""}`}
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
 * Local destination path form
 * Allows user to specify destination directory on local system
 */
function LocalPathForm({
  hostConfig,
  remotePath,
}: {
  hostConfig: SSHHostConfig;
  remotePath: string;
}) {
  const [localPath, setLocalPath] = useState<string>("");
  const [localPathError, setLocalPathError] = useState<string | undefined>();

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
    localPath: string;
    humanReadable: boolean;
    progress: boolean;
    deleteExtra: boolean;
  }) {
    const localPathValue = values.localPath.trim();

    if (!localPathValue) {
      console.error("Local path is empty");
      setLocalPathError("Local path is required");
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid Local Path",
        message: "Please enter a destination path for the downloaded files",
      });
      return;
    }

    // Validate remote path
    const remoteValidation = validateRemotePath(remotePath);
    if (!remoteValidation.valid) {
      console.error("Remote path validation failed:", remoteValidation.error);
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
    await executeTransfer(hostConfig, remotePath, localPathValue, {
      humanReadable: values.humanReadable,
      progress: values.progress,
      delete: values.deleteExtra,
    });
  }

  async function executeTransfer(
    hostConfig: SSHHostConfig,
    remotePath: string,
    localPath: string,
    rsyncOptions: RsyncOptions,
  ) {
    // Show initial progress toast
    await showToast({
      style: Toast.Style.Animated,
      title: "Transferring files...",
      message: `Downloading from ${hostConfig.host}`,
    });

    console.log("Starting download:", {
      host: hostConfig.host,
      remotePath,
      localPath,
    });

    try {
      const options: TransferOptions = {
        hostConfig,
        localPath,
        remotePath,
        direction: TransferDirection.DOWNLOAD,
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
        console.log("Download completed successfully");
        // Show formatted rsync output message (includes file sizes and progress if flags enabled)
        await showToast({
          style: Toast.Style.Success,
          title: "Download Successful",
          message: result.message,
        });
        // Log full output for debugging
        if (result.stdout) {
          console.log("Rsync output:", result.stdout);
        }
        // Close the extension after successful download
        await popToRoot();
      } else {
        console.error("Download failed:", result.message);
        await showToast({
          style: Toast.Style.Failure,
          title: "Download Failed",
          message: result.message,
        });
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      console.error("Download error:", err);
      await showToast({
        style: Toast.Style.Failure,
        title: "Download Failed",
        message: errorMessage,
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Download" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="localPath"
        title="Local Destination Path"
        placeholder="/path/to/local/destination"
        value={localPath}
        onChange={(value: string) => {
          setLocalPath(value);
          setLocalPathError(undefined);
        }}
        error={localPathError}
        info="Enter the destination directory on your local system"
      />
      <Form.Description title="Remote Path" text={remotePath} />
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
