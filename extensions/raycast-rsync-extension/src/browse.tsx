import {
  List,
  ActionPanel,
  Action,
  Form,
  showToast,
  Toast,
  Icon,
  useNavigation,
} from "@raycast/api";
import React, { useState, useEffect } from "react";
import { parseSSHConfig } from "./utils/sshConfig";
import { executeRemoteLs } from "./utils/ssh";
import { validateRemotePath, validateHostConfig } from "./utils/validation";
import { SSHHostConfig, RemoteFile } from "./types/server";

/**
 * Main browse command component
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
      {hosts.map((host) => (
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
                title="Browse Remote Files"
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
 * Allows user to specify path to browse on remote server
 */
function RemotePathForm({ hostConfig }: { hostConfig: SSHHostConfig }) {
  const [remotePath, setRemotePath] = useState<string>("~");
  const [remotePathError, setRemotePathError] = useState<string | undefined>();
  const { push } = useNavigation();

  async function handleSubmit(values: { remotePath: string }) {
    const remotePathValue = values.remotePath.trim() || "~";

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

    // Navigate to file list after successful validation
    push(
      <RemoteFileListLoader
        hostConfig={hostConfig}
        remotePath={remotePathValue}
      />,
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Browse" onSubmit={handleSubmit} />
          <Action.Push
            title="Browse Directory"
            target={
              <RemoteFileListLoader
                hostConfig={hostConfig}
                remotePath={remotePath}
              />
            }
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="remotePath"
        title="Remote Path"
        placeholder="~ or /path/to/directory"
        value={remotePath}
        onChange={(value) => {
          setRemotePath(value);
          setRemotePathError(undefined);
        }}
        error={remotePathError}
        info="Enter the directory path on the remote server to browse"
      />
      <Form.Description
        title="Host Details"
        text={`Browsing: ${hostConfig.host}${hostConfig.hostName ? ` (${hostConfig.hostName})` : ""}`}
      />
      {hostConfig.user && (
        <Form.Description title="User" text={hostConfig.user} />
      )}
      {hostConfig.port && (
        <Form.Description title="Port" text={hostConfig.port.toString()} />
      )}
    </Form>
  );
}

/**
 * Remote file list loader component
 * Loads files from remote server and displays them
 */
function RemoteFileListLoader({
  hostConfig,
  remotePath,
}: {
  hostConfig: SSHHostConfig;
  remotePath: string;
}) {
  const [files, setFiles] = useState<RemoteFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRemoteFiles();
  }, [remotePath]);

  async function loadRemoteFiles() {
    setIsLoading(true);
    setError(null);

    console.log("Loading remote files:", {
      host: hostConfig.host,
      remotePath,
    });

    try {
      const remoteFiles = await executeRemoteLs(hostConfig, remotePath);
      setFiles(remoteFiles);

      if (remoteFiles.length === 0) {
        await showToast({
          style: Toast.Style.Success,
          title: "Directory is empty",
        });
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      console.error("Browse error:", err);
      setError(errorMessage);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to List Files",
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (error) {
    return (
      <List>
        <List.EmptyView
          title="Error Loading Files"
          description={error}
          actions={
            <ActionPanel>
              <Action title="Retry" onAction={loadRemoteFiles} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <RemoteFileList
      hostConfig={hostConfig}
      remotePath={remotePath}
      files={files}
      isLoading={isLoading}
    />
  );
}

/**
 * Remote file list view
 * Displays files and directories from remote server
 */
function RemoteFileList({
  hostConfig,
  remotePath,
  files,
  isLoading,
}: {
  hostConfig: SSHHostConfig;
  remotePath: string;
  files: RemoteFile[];
  isLoading?: boolean;
}) {
  return (
    <List searchBarPlaceholder="Search files..." isLoading={isLoading}>
      {files.map((file, index) => (
        <List.Item
          key={`${file.name}-${index}`}
          title={file.name}
          icon={file.isDirectory ? Icon.Folder : Icon.Document}
          accessories={[
            { text: file.size || "" },
            { text: file.permissions || "" },
          ]}
          actions={
            <ActionPanel>
              {file.isDirectory ? (
                <>
                  <Action.Push
                    title="Open Directory"
                    target={
                      <RemoteFileListLoader
                        hostConfig={hostConfig}
                        remotePath={
                          remotePath.endsWith("/")
                            ? `${remotePath}${file.name}`
                            : `${remotePath}/${file.name}`
                        }
                      />
                    }
                  />
                  <Action.CopyToClipboard
                    title="Copy Path"
                    content={
                      remotePath.endsWith("/")
                        ? `${remotePath}${file.name}`
                        : `${remotePath}/${file.name}`
                    }
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Name"
                    content={file.name}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                </>
              ) : (
                <>
                  <Action.CopyToClipboard
                    title="Copy Path"
                    content={
                      remotePath.endsWith("/")
                        ? `${remotePath}${file.name}`
                        : `${remotePath}/${file.name}`
                    }
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Name"
                    content={file.name}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                </>
              )}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
