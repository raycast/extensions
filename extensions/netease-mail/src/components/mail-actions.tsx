import { Action, ActionPanel, Clipboard, Icon, showToast, Toast } from "@raycast/api";
import { MailMessage, markMailAsRead } from "../lib/mail-client.js";
import { getMailPreferences } from "../lib/preferences.js";
import { openWebMailSearch } from "../lib/webmail.js";
import { MailDetail } from "./mail-detail.js";

export function MailActions({ message, onMarkedRead }: { message: MailMessage; onMarkedRead?: () => void }) {
  const preferences = getMailPreferences();

  return (
    <ActionPanel>
      <Action.Push title="Open Mail" icon={Icon.Envelope} target={<MailDetail message={message} />} />
      <Action.CopyToClipboard title="Copy Summary" icon={Icon.Clipboard} content={toSummary(message)} />
      <Action
        title="Mark as Read"
        icon={Icon.CheckCircle}
        shortcut={{ modifiers: ["cmd"], key: "e" }}
        onAction={async () => {
          const toast = await showToast({
            style: Toast.Style.Animated,
            title: "Marking as read",
          });
          try {
            await markMailAsRead(message.uid);
            toast.style = Toast.Style.Success;
            toast.title = "Marked as read";
            onMarkedRead?.();
          } catch (error) {
            toast.style = Toast.Style.Failure;
            toast.title = "Failed to mark as read";
            toast.message = error instanceof Error ? error.message : String(error);
          }
        }}
      />
      <Action
        title="Open NetEase Web Search"
        icon={Icon.MagnifyingGlass}
        shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
        onAction={() => openWebMailSearch(preferences.emailAddress, message.subject)}
      />
      <Action
        title="Copy Sender"
        icon={Icon.Person}
        onAction={() => Clipboard.copy(message.fromAddress || message.from)}
      />
    </ActionPanel>
  );
}

function toSummary(message: MailMessage): string {
  return [
    `From: ${message.from}`,
    `Subject: ${message.subject}`,
    `Date: ${message.date?.toLocaleString() || "-"}`,
    "",
    message.snippet,
  ]
    .filter(Boolean)
    .join("\n");
}
