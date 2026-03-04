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

  // Escape spaces and special chars in project path
  const escapedPath = session.projectPath.replace(/(["\s'$`\\])/g, "\\$1");
  const resumeCommand = `cd ${escapedPath} && gemini --resume ${session.id}`;

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
          onAction={async () => {
            if (!existsSync(session.projectPath)) {
              await showToast({
                style: Toast.Style.Failure,
                title: "Directory not found",
                message: session.projectPath,
              });
              return;
            }
            await open(session.projectPath);
          }}
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
