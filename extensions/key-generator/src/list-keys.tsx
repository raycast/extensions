import {
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  useNavigation,
  Form,
  confirmAlert,
  Alert,
  trash,
} from "@raycast/api";

import { useEffect, useState } from "react";
import { scanSSHDirectory } from "./utils/filesystem";
import { SSHKey } from "./types/ssh";

export default function Command() {
  const [keys, setKeys] = useState<SSHKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const { push } = useNavigation();

  useEffect(() => {
    loadKeys();
  }, []);

  async function loadKeys() {
    setIsLoading(true);
    try {
      const data = await scanSSHDirectory();
      setKeys(data);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load keys",
        message: (error as Error).message,
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteKey(key: SSHKey) {
    if (
      await confirmAlert({
        title: "Delete SSH Key",
        message: `Are you sure you want to delete '${key.name}'? This will move both the public and private files to the Trash.`,
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      try {
        const fs = await import("fs");
        const filesToTrash = [key.publicKeyPath, key.privateKeyPath].filter(
          (filePath): filePath is string => Boolean(filePath) && fs.existsSync(filePath),
        );

        if (filesToTrash.length === 0) {
          throw new Error("No key files were found on disk for this entry.");
        }

        await trash(filesToTrash);
        showToast({
          style: Toast.Style.Success,
          title: "Key Deleted",
          message: key.name,
        });
        loadKeys();
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete key",
          message: (error as Error).message,
        });
      }
    }
  }

  return (
    <List isLoading={isLoading} isShowingDetail={isShowingDetail} searchBarPlaceholder="Search keys...">
      {!isLoading && keys.length === 0 && (
        <List.EmptyView
          title="No SSH Keys"
          description="No keys were found in ~/.ssh. Generate a key to get started."
        />
      )}

      {keys.map((key, index) => (
        <List.Item
          key={`${key.name}-${key.fingerprint || "no-fingerprint"}-${index}`}
          title={key.name}
          icon={key.storageType === "hardware" ? Icon.MemoryChip : Icon.Hashtag}
          accessories={
            !isShowingDetail
              ? [
                  { text: key.algorithm, tooltip: "Algorithm" },
                  {
                    text: key.storageType.toUpperCase(),
                    tooltip: "Storage Type",
                  },
                ]
              : []
          }
          detail={
            <List.Item.Detail
              markdown={`### ${key.name}\n\nComment: ${key.comment || "None"}`}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Algorithm" text={key.algorithm} />
                  <List.Item.Detail.Metadata.Label title="Storage Type" text={key.storageType} />
                  <List.Item.Detail.Metadata.Label title="Fingerprint" text={key.fingerprint} />
                  <List.Item.Detail.Metadata.Label title="Public Key Path" text={key.publicKeyPath} />
                  <List.Item.Detail.Metadata.Label title="Private Key Path" text={key.privateKeyPath} />

                  <List.Item.Detail.Metadata.Label title="Passphrase" text={key.hasPassphrase ? "Yes" : "No"} />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Public Key"
                content={key.publicKeyContent}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action
                title={isShowingDetail ? "Hide Details" : "Show Details"}
                icon={Icon.Sidebar}
                onAction={() => setIsShowingDetail(!isShowingDetail)}
                shortcut={{ modifiers: ["cmd"], key: "enter" }}
              />
              <Action.CopyToClipboard
                title="Copy Fingerprint"
                content={key.fingerprint}
                shortcut={{
                  modifiers: ["cmd", "shift"],
                  key: "c",
                }}
              />

              {Boolean(key.publicKeyPath || key.privateKeyPath) && (
                <>
                  <Action
                    title="Rename Key"
                    icon={Icon.Pencil}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={() => push(<RenameKeyForm keyItem={key} onRename={loadKeys} />)}
                  />
                  <Action
                    title="Reveal in Finder"
                    icon={Icon.Finder}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                    onAction={async () => {
                      const { execFile } = await import("child_process");
                      execFile("open", ["-R", key.publicKeyPath || key.privateKeyPath]);
                    }}
                  />
                  <ActionPanel.Section title="Danger Zone">
                    <Action
                      title="Delete Key"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{
                        modifiers: ["ctrl"],
                        key: "x",
                      }}
                      onAction={() => handleDeleteKey(key)}
                    />
                  </ActionPanel.Section>
                </>
              )}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function RenameKeyForm(props: { keyItem: SSHKey; onRename: () => void }) {
  const { pop } = useNavigation();
  async function handleSubmit(values: { newName: string }) {
    const newName = values.newName.trim();
    if (newName === "" || newName.includes("/") || newName.includes("\\") || newName.includes("..")) {
      showToast({
        style: Toast.Style.Failure,
        title: "Invalid filename",
        message: "Name must not be empty or contain path separators/traversal.",
      });
      return;
    }

    try {
      const fs = await import("fs/promises");
      const path = await import("path");
      const sshDir = path.dirname(props.keyItem.publicKeyPath);
      const newPub = path.join(sshDir, `${newName}.pub`);
      const newPriv = path.join(sshDir, newName);

      const privatePath = props.keyItem.privateKeyPath;
      let privateExists = false;
      if (privatePath) {
        try {
          await fs.access(privatePath);
          privateExists = true;
        } catch {
          privateExists = false;
        }
      }

      if (privateExists) {
        await fs.rename(privatePath, newPriv);
      }

      try {
        await fs.rename(props.keyItem.publicKeyPath, newPub);
      } catch (error) {
        if (privateExists) {
          try {
            await fs.rename(newPriv, privatePath);
          } catch {
            // Best-effort rollback; keep original error for user context.
          }
        }
        throw error;
      }
      showToast({ style: Toast.Style.Success, title: "Key Renamed" });
      props.onRename();
      pop();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to rename",
        message: (error as Error).message,
      });
    }
  }
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Rename" onSubmit={handleSubmit} shortcut={{ modifiers: ["cmd"], key: "s" }} />
        </ActionPanel>
      }
    >
      <Form.TextField id="newName" title="New Name" defaultValue={props.keyItem.name} />
    </Form>
  );
}
