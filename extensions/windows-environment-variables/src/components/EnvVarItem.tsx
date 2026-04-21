import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  LaunchType,
  launchCommand,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { spawn } from "node:child_process";
import { deleteEnvVar } from "../utils/powershell.js";
import {
  EnvVar,
  PROTECTED_VARIABLES,
  SENSITIVE_PATTERNS,
} from "../utils/types.js";
import { AddEnvVarForm } from "./AddEnvVarForm.js";
import { EditEnvVarForm } from "./EditEnvVarForm.js";

interface EnvVarItemProps {
  envVar: EnvVar;
  onRefresh: () => void | Promise<void>;
}

function isSensitive(name: string): boolean {
  const upper = name.toUpperCase();
  return SENSITIVE_PATTERNS.some((p: string) => upper.includes(p));
}

function formatDetailMarkdown(envVar: EnvVar): string {
  const isPath =
    envVar.name.toUpperCase() === "PATH" ||
    envVar.name.toUpperCase() === "PATHEXT";

  if (isPath) {
    const entries = envVar.value
      .split(";")
      .filter((e: string) => e.trim() !== "");
    const list = entries.map((e: string) => `- \`${e}\``).join("\n");
    return `## ${envVar.name}\n\n${list}`;
  }

  const displayValue = isSensitive(envVar.name)
    ? envVar.value.slice(0, 4) + "****"
    : envVar.value;
  return `## ${envVar.name}\n\n\`\`\`\n${displayValue}\n\`\`\``;
}

export function EnvVarItem({ envVar, onRefresh }: EnvVarItemProps) {
  const isPath =
    envVar.name.toUpperCase() === "PATH" ||
    envVar.name.toUpperCase() === "PATHEXT";
  const isProtected = PROTECTED_VARIABLES.includes(envVar.name.toUpperCase());
  const sensitive = isSensitive(envVar.name);

  async function handleDelete() {
    if (isProtected) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Cannot delete protected variable",
        message: `${envVar.name} is a protected system variable`,
      });
      return;
    }

    const confirmed = await confirmAlert({
      title: `Delete "${envVar.name}"?`,
      message: `This will permanently remove the ${envVar.scope === "Machine" ? "system" : "user"} variable "${envVar.name}".`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });

    if (!confirmed) return;

    try {
      if (envVar.scope === "Machine") {
        await showToast({
          style: Toast.Style.Animated,
          title: "Elevation required...",
          message: "Approve the UAC prompt",
        });
      }
      await deleteEnvVar(envVar.name, envVar.scope);
      await showToast({
        style: Toast.Style.Success,
        title: "Variable deleted",
        message: envVar.name,
      });
      onRefresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete variable",
        message,
      });
    }
  }

  return (
    <List.Item
      title={envVar.name}
      icon={isPath ? Icon.Folder : Icon.Key}
      keywords={[envVar.name, envVar.scope]}
      accessories={[
        ...(sensitive
          ? [{ tag: { value: "sensitive", color: Color.Red } }]
          : []),
        {
          tag: {
            value: envVar.scope === "Machine" ? "System" : "User",
            color: envVar.scope === "Machine" ? Color.Orange : Color.Blue,
          },
        },
      ]}
      detail={
        <List.Item.Detail
          markdown={formatDetailMarkdown(envVar)}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label
                title="Name"
                text={envVar.name}
              />
              <List.Item.Detail.Metadata.Label
                title="Scope"
                text={envVar.scope === "Machine" ? "System" : "User"}
              />
              <List.Item.Detail.Metadata.Label
                title="Length"
                text={`${envVar.value.length} chars`}
              />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy Value" content={envVar.value} />
            <Action.CopyToClipboard
              title="Copy Name"
              content={envVar.name}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy as Set"
              content={`set ${envVar.name}=${envVar.value}`}
              shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
            />
            <Action.Push
              title="Edit Variable"
              icon={Icon.Pencil}
              target={<EditEnvVarForm envVar={envVar} onSaved={onRefresh} />}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
            />
            {envVar.name.toUpperCase() === "PATH" && (
              <Action
                title="Edit in Path Editor"
                icon={Icon.Terminal}
                shortcut={{ modifiers: ["cmd"], key: "p" }}
                onAction={async () => {
                  try {
                    await launchCommand({
                      name: "edit-path",
                      type: LaunchType.UserInitiated,
                    });
                  } catch {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Failed to open PATH editor",
                    });
                  }
                }}
              />
            )}
            <Action
              title="Open System Dialog"
              icon={Icon.Globe}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
              onAction={() =>
                spawn("rundll32", ["sysdm.cpl,EditEnvironmentVariables"], {
                  detached: true,
                })
              }
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.Push
              title="Add New Variable"
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              target={<AddEnvVarForm onSaved={onRefresh} />}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Delete Variable"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={handleDelete}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={onRefresh}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
