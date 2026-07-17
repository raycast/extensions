import {
  Action,
  ActionPanel,
  Icon,
  Keyboard,
  open,
  showToast,
  Toast,
  confirmAlert,
  useNavigation,
  trash,
} from "@raycast/api";
import { existsSync } from "fs";
import { Session } from "../types";

interface SessionActionsProps {
  session: Session;
  mutate: () => Promise<void>;
  isDetail?: boolean;
}

export function SessionActions({ session, mutate, isDetail }: SessionActionsProps) {
  const { pop } = useNavigation();

  // Build a shell-safe resume command for copying only.
  // If you need to execute this command, prefer spawning a process with
  // an args array (e.g. `spawn("gemini", ["--resume", id], { cwd })`) instead
  // of interpolating into a shell to avoid injection risks.
  const escapeShellArg = (s: string) => {
    return `'${s.replace(/'/g, "'\\''")}'`;
  };

  const resumeCommand = `cd ${escapeShellArg(session.projectPath)} && gemini --resume ${escapeShellArg(session.id)}`;

  async function handleDelete() {
    const confirmed = await confirmAlert({
      title: "Delete Session",
      message: `Are you sure you want to delete session from "${session.title}"? This cannot be undone.`,
      icon: { source: Icon.Trash, tintColor: "#FF0000" },
    });

    if (!confirmed) {
      return;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: "Deleting session..." });

    try {
      if (existsSync(session.filePath)) {
        await trash(session.filePath);
      }
      toast.style = Toast.Style.Success;
      toast.title = "Session deleted";

      if (isDetail) {
        pop();
      }

      await mutate();
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to delete session";
      toast.message = msg;
    }
  }

  async function handleOpenInVSCode() {
    if (!existsSync(session.projectPath)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Directory not found",
        message: session.projectPath,
      });
      return;
    }

    try {
      await open(session.projectPath, "com.microsoft.VSCode");
      await showToast({ style: Toast.Style.Success, title: "Opened project in VS Code" });
    } catch {
      await showToast({ style: Toast.Style.Failure, title: "VS Code not found" });
    }
  }

  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.CopyToClipboard title="Copy Session ID" content={session.id} icon={Icon.Clipboard} />
        <Action.CopyToClipboard
          title="Copy Resume Command"
          content={resumeCommand}
          icon={Icon.Terminal}
          shortcut={{ modifiers: ["cmd"], key: "enter" }}
        />
        <Action.CopyToClipboard title="Copy Project Directory" content={session.projectPath} icon={Icon.Folder} />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          title="Open Project Directory"
          icon={Icon.Folder}
          shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
          onAction={handleOpenInVSCode}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          title="Delete Session File"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={Keyboard.Shortcut.Common.Remove}
          onAction={handleDelete}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={mutate}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
