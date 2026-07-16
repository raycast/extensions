import { Detail, ActionPanel, Action, Icon, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { fetchNotifications, runAppleScript, type NotificationItem } from "./ntfctl-utils";

type NotifInfo = NotificationItem;

function fetchLatestNotification(): NotifInfo | null {
  const items = fetchNotifications();
  return items.length > 0 ? items[0] : null;
}

export default function Command() {
  const [notif, setNotif] = useState<NotifInfo | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      setNotif(fetchLatestNotification());
    } catch (e) {
      setError(String(e));
    }
  }, []);

  if (error) {
    const md = "# ⚠️ Error\n\nFailed to read notifications:\n\n```\n" + error + "\n```";
    return <Detail markdown={md} />;
  }

  if (notif === undefined) {
    return <Detail isLoading />;
  }

  if (notif === null) {
    return <Detail markdown="# 🔔 No Notifications\n\nNotification Center is empty." />;
  }

  const md =
    "# 📬  Latest Notification\n\n---\n\n" +
    "|       |                        |\n" +
    "|-------|------------------------|\n" +
    "| **App**   | " +
    notif.app +
    "       |\n" +
    "| **Title** | " +
    notif.title +
    "     |\n" +
    "| **Body**  | " +
    notif.body +
    "      |\n\n" +
    "---\n\n" +
    "_Press ⌘C to copy, or use the actions below._";

  return (
    <Detail
      markdown={md}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="App" text={notif.app} />
          <Detail.Metadata.Label title="Title" text={notif.title} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Body" text={notif.body} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Notification"
            content={notif.app + " — " + notif.title + "\n" + notif.body}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action.CopyToClipboard title="Copy App Name" content={notif.app} />
          <Action.CopyToClipboard title="Copy Title" content={notif.title} />
          <Action.CopyToClipboard title="Copy Body" content={notif.body} />
          <Action
            title="Dismiss This Notification"
            icon={Icon.Trash}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            onAction={async () => {
              const toast = await showToast({
                style: Toast.Style.Animated,
                title: "Dismissing…",
              });
              try {
                runAppleScript("ntfctl-dismiss.applescript");
                toast.style = Toast.Style.Success;
                toast.title = "Notification dismissed";
              } catch (e) {
                toast.style = Toast.Style.Failure;
                toast.title = "Failed to dismiss";
                toast.message = String(e);
              }
            }}
          />
        </ActionPanel>
      }
    />
  );
}
