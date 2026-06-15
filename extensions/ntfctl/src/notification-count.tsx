import { Detail, ActionPanel, Action, Icon } from "@raycast/api";
import { execSync } from "child_process";
import { useEffect, useState } from "react";
import { runAppleScript } from "./ntfctl-utils";

interface NotifSummary {
  count: number;
  items: { app: string; title: string; body: string }[];
}

function fetchNotificationSummary(): NotifSummary | null {
  const raw = execSync(
    `osascript -e '
    tell application "System Events"
      tell process "ControlCenter"
        click menu bar item 2 of menu bar 1
      end tell
      delay 0.8
      tell process "NotificationCenter"
        try
          set ncWindow to item 1 of (every window)
        on error errMsg
          return "ERR:NoWindow:" & errMsg
        end try
        try
          set allEls to entire contents of ncWindow
        on error errMsg
          return "ERR:EntireContents:" & errMsg
        end try
        set output to ""
        set appName to ""
        set notifTitle to ""
        set notifBody to ""
        set foundApp to false
        set foundTitle to false
        set count to 0
        repeat with el in allEls
          if role of el is "AXStaticText" then
            try
              set t to value of el
              if t is not missing value and t is not "" then
                set elemPos to position of el
                set elemY to item 2 of elemPos
                if elemY > 40 then
                  if not foundApp then
                    set appName to t
                    set foundApp to true
                  else if not foundTitle then
                    set notifTitle to t
                    set foundTitle to true
                  else if notifBody is "" then
                    set notifBody to t
                    set count to count + 1
                    set output to output & appName & "|||" & notifTitle & "|||" & notifBody & "\\n"
                    set appName to ""
                    set notifTitle to ""
                    set notifBody to ""
                    set foundApp to false
                    set foundTitle to false
                  end if
                end if
              end if
            end try
          end if
        end repeat
      end tell
      tell process "ControlCenter"
        click menu bar item 2 of menu bar 1
      end tell
      if count is 0 then
        return "NO_NOTIFS"
      end if
      return (count as text) & "|||" & output
    end tell'`,
    { encoding: "utf-8", timeout: 15_000 },
  ).trim();

  if (raw === "NO_NOTIFS" || raw === "") return null;
  if (raw.startsWith("ERR:")) throw new Error(raw);

  const firstSeparator = raw.indexOf("|||");
  if (firstSeparator === -1) return null;

  const countStr = raw.substring(0, firstSeparator);
  const count = parseInt(countStr, 10);
  const itemsRaw = raw.substring(firstSeparator + 3);

  const items = itemsRaw
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|||");
      return {
        app: parts[0] || "Unknown",
        title: parts[1] || "",
        body: parts[2] || "",
      };
    });

  return { count: isNaN(count) ? items.length : count, items };
}

export default function Command() {
  const [summary, setSummary] = useState<NotifSummary | null | undefined>(
    undefined,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      setSummary(fetchNotificationSummary());
    } catch (e) {
      setError(String(e));
    }
  }, []);

  if (error) {
    const md =
      "# ⚠️ Error\n\nFailed to count notifications:\n\n```\n" + error + "\n```";
    return <Detail markdown={md} />;
  }

  if (summary === undefined) {
    return <Detail isLoading />;
  }

  if (summary === null || summary.count === 0) {
    return (
      <Detail markdown="# 🔔 No Notifications\n\nNotification Center is empty." />
    );
  }

  let md =
    "# 🔔 " +
    summary.count +
    " Notification" +
    (summary.count === 1 ? "" : "s") +
    "\n\n---\n\n";

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

  const allText = summary.items
    .map((item) => "[" + item.app + "] " + item.title + "\n" + item.body)
    .join("\n\n");

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
            onAction={() => {
              runAppleScript("ntfctl-clear.applescript");
            }}
          />
        </ActionPanel>
      }
    />
  );
}
