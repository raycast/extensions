import {
  Detail,
  ActionPanel,
  Action,
  Icon,
  Clipboard,
  showToast,
  Toast,
  confirmAlert,
} from "@raycast/api";
import { format } from "date-fns";
import { ShareSession } from "../types";
import { globalSessions } from "../sessionManager";

interface SessionDetailsProps {
  session: ShareSession;
  onClose: () => void;
}

export function SessionDetails({ session, onClose }: SessionDetailsProps) {
  const stopSession = async () => {
    const confirmed = await confirmAlert({
      title: `Stop sharing ${session.fileName}?`,
      message:
        "This will terminate the sendme process and prevent further downloads.",
      primaryAction: {
        title: "Stop Sharing",
      },
    });

    if (!confirmed) return;

    try {
      await globalSessions.stopSession(session.id);
      await showToast({
        style: Toast.Style.Success,
        title: "File sharing stopped",
      });
      onClose();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error stopping session",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const markdown = `# File Sharing Session: ${session.fileName}

Your file **${session.fileName}** is currently being shared with the following ticket:

\`\`\`
${session.ticket}
\`\`\`

## Instructions for the Recipient

Tell the recipient to run:

\`\`\`
./sendme receive ${session.ticket}
\`\`\`

## Session Details

- **File Path:** ${session.filePath}
- **Started:** ${format(session.startTime, "MMM d, yyyy h:mm a")}
- **Session ID:** ${session.id}
${session.pid ? `- **Process ID:** ${session.pid}` : ""}
${session.isDetached ? `\n> ⚠️ This is a recovered session from a previous run.` : ""}

## Keyboard Shortcuts

- **⌘C** - Copy ticket to clipboard
- **⌘⌫** - Stop sharing this file
- **⌘←** - Return to sessions list
`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Copy Ticket"
            icon={Icon.Clipboard}
            onAction={async () => {
              await Clipboard.copy(session.ticket);
              await showToast({
                style: Toast.Style.Success,
                title: "Ticket Copied",
              });
            }}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action
            title="Stop Sharing"
            icon={Icon.Stop}
            style={Action.Style.Destructive}
            onAction={stopSession}
            shortcut={{ modifiers: ["cmd"], key: "backspace" }}
          />
          <Action
            title="Back to Sessions List"
            icon={Icon.ArrowLeft}
            onAction={onClose}
            shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
          />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Actions"
            text="Press ⌘C to copy, ⌘⌫ to stop sharing"
          />
        </Detail.Metadata>
      }
    />
  );
}
