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
import { auditSSHKeys, AuditIssue } from "./utils/audit";
import { execFile } from "child_process";

export default function Command() {
  const { push } = useNavigation();
  const [issues, setIssues] = useState<AuditIssue[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAudit();
  }, []);

  async function loadAudit() {
    setIsLoading(true);
    try {
      const data = await auditSSHKeys();
      setIssues(data);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to run audit",
        message: (error as Error).message,
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleFixPermissions(issue: AuditIssue) {
    const targetMode = issue.title.includes("Directory") ? "700" : "600";
    try {
      execFile("chmod", [targetMode, issue.filePath], (error) => {
        if (error) {
          showToast({
            style: Toast.Style.Failure,
            title: "Failed to fix",
            message: error.message,
          });
        } else {
          showToast({
            style: Toast.Style.Success,
            title: "Permissions fixed",
          });
          loadAudit();
        }
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fix",
        message: (error as Error).message,
      });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search issues...">
      {issues.map((issue: AuditIssue, index: number) => (
        <List.Item
          key={`${issue.type}-${index}`}
          title={issue.title}
          subtitle={issue.description}
          icon={
            issue.type === "permission"
              ? Icon.Lock
              : issue.type === "passphrase"
                ? Icon.Key
                : issue.type === "orphan"
                  ? Icon.Trash
                  : Icon.Warning
          }
          accessories={[{ text: issue.type.toUpperCase() }]}
          actions={
            <ActionPanel>
              {issue.type === "permission" && (
                <Action
                  title="Fix Permissions"
                  icon={Icon.Check}
                  shortcut={{ modifiers: ["cmd"], key: "f" }}
                  onAction={() => handleFixPermissions(issue)}
                />
              )}
              {issue.type === "passphrase" && (
                <Action
                  title="Set Passphrase"
                  icon={Icon.Lock}
                  shortcut={{ modifiers: ["cmd"], key: "p" }}
                  onAction={() => push(<SetPassphraseForm issue={issue} onFix={loadAudit} />)}
                />
              )}
              {issue.type === "orphan" && (
                <ActionPanel.Section title="Danger Zone">
                  <Action
                    title="Delete File"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{
                      modifiers: ["ctrl"],
                      key: "x",
                    }}
                    onAction={async () => {
                      const shouldDelete = await confirmAlert({
                        title: "Delete Orphan File",
                        message: `Are you sure you want to delete '${issue.filePath}'? This will move the file to the Trash.`,
                        primaryAction: {
                          title: "Delete",
                          style: Alert.ActionStyle.Destructive,
                        },
                      });

                      if (!shouldDelete) {
                        return;
                      }

                      try {
                        await trash(issue.filePath);
                        showToast({
                          style: Toast.Style.Success,
                          title: "Deleted file",
                        });
                        loadAudit();
                      } catch (error) {
                        showToast({
                          style: Toast.Style.Failure,
                          title: "Failed to delete file",
                          message: (error as Error).message,
                        });
                      }
                    }}
                  />
                </ActionPanel.Section>
              )}
              <Action
                title="Reveal in Finder"
                icon={Icon.Finder}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
                onAction={async () => {
                  execFile("open", ["-R", issue.filePath]);
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function SetPassphraseForm(props: { issue: AuditIssue; onFix: () => void }) {
  const { pop } = useNavigation();
  async function handleSubmit(values: { passphrase?: string }) {
    if (!values.passphrase) {
      showToast({
        style: Toast.Style.Failure,
        title: "Passphrase cannot be empty",
      });
      return;
    }
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Setting passphrase...",
    });
    try {
      // -P "" specifies that the current passphrase is empty
      execFile("ssh-keygen", ["-p", "-f", props.issue.filePath, "-P", "", "-N", values.passphrase], (error) => {
        if (error) {
          toast.style = Toast.Style.Failure;
          toast.title = "Failed to set passphrase";
          toast.message = error.message;
        } else {
          toast.style = Toast.Style.Success;
          toast.title = "Passphrase set successfully";
          props.onFix();
          pop();
        }
      });
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Error setting passphrase";
      toast.message = (e as Error).message;
    }
  }
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Set Passphrase"
            onSubmit={handleSubmit}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
          />
        </ActionPanel>
      }
    >
      <Form.PasswordField id="passphrase" title="New Passphrase" placeholder="Enter new passphrase" />
    </Form>
  );
}
