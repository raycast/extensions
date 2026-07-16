import { Detail, ActionPanel, Action, Icon, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { fetchNotifications, runAppleScript, type NotificationItem } from "./ntfctl-utils";

interface NotifSummary {
  count: number;
  items: NotificationItem[];
}

function fetchNotificationSummary(): NotifSummary | null {
  const items = fetchNotifications();
  return items.length > 0 ? { count: items.length, items } : null;
}

export default function Command() {
  const [summary, setSummary] = useState<NotifSummary | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      setSummary(fetchNotificationSummary());
    } catch (e) {
      setError(String(e));
    }
  }, []);

  if (error) {
    const md = "# ⚠️ Error\n\nFailed to count notifications:\n\n```\n" + error + "\n```";
    return <Detail markdown={md} />;
  }

  if (summary === undefined) {
    return <Detail isLoading />;
  }

  if (summary === null || summary.count === 0) {
    return <Detail markdown="# 🔔 No Notifications\n\nNotification Center is empty." />;
  }

  let md = "# 🔔 " + summary.count + " Notification" + (summary.count === 1 ? "" : "s") + "\n\n---\n\n";

  for (const item of summary.items) {
    md += "### " + item.app + "\n";
    md += "> **" + item.title + "**\n";
    if (item.body) {
      md += "> " + item.body + "\n";
    }
    md += "\n";
  }

  md +=
    "---\n\n_" +
    summary.count +
    " notification" +
    (summary.count === 1 ? "" : "s") +
    " waiting in Notification Center._";

  const allText = summary.items.map((item) => "[" + item.app + "] " + item.title + "\n" + item.body).join("\n\n");

  return (
    <Detail
      markdown={md}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Total" text={String(summary.count)} />
          <Detail.Metadata.Separator />
          {summary.items.map((item, i) => (
            <Detail.Metadata.Label key={i} title={item.app} text={item.title} />
          ))}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy All Notifications"
            content={allText}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action
            title="Clear All Notifications"
            icon={Icon.Trash}
            shortcut={{ modifiers: ["cmd"], key: "x" }}
            onAction={async () => {
              const toast = await showToast({
                style: Toast.Style.Animated,
                title: "Clearing notifications…",
              });
              try {
                runAppleScript("ntfctl-clear.applescript");
                toast.style = Toast.Style.Success;
                toast.title = "All notifications cleared";
              } catch (e) {
                toast.style = Toast.Style.Failure;
                toast.title = "Failed to clear";
                toast.message = String(e);
              }
            }}
          />
        </ActionPanel>
      }
    />
  );
}
