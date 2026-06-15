import {
  Detail,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import { execSync } from "child_process";
import { useEffect, useState } from "react";
import { runAppleScript } from "./ntfctl-utils";

interface NotifInfo {
  app: string;
  title: string;
  body: string;
}

function fetchLatestNotification(): NotifInfo | null {
  const raw = execSync(
    `osascript -e '
    tell application "System Events"
      try
        tell process "ControlCenter"
          click menu bar item 2 of menu bar 1
        end tell
      on error errMsg
        return "ERR:ControlCenter:" & errMsg
      end try
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
        set appName to ""
        set notifTitle to ""
        set notifBody to ""
        set foundApp to false
        set foundTitle to false
        repeat with el in allEls
          if role of el is "AXStaticText" then
            try
              set t to value of el
              if t is not missing value and t is not "" then
                set elemPos to position of el
                set elemY to item 2 of elemPos
                if not foundApp then
                  if elemY > 40 then
                    set appName to t
                    set foundApp to true
                  end if
                else if not foundTitle then
                  set notifTitle to t
                  set foundTitle to true
                else if notifBody is "" then
                  set notifBody to t
                  exit repeat
                end if
              end if
            end try
          end if
        end repeat
      end tell
      tell process "ControlCenter"
        click menu bar item 2 of menu bar 1
      end tell
      if appName is "" then
        return "NO_NOTIFS"
      end if
      return appName & "|||" & notifTitle & "|||" & notifBody
    end tell'`,
    { encoding: "utf-8", timeout: 15_000 },
  ).trim();

  if (raw === "NO_NOTIFS" || raw === "") return null;
  if (raw.startsWith("ERR:")) throw new Error(raw);

  const parts = raw.split("|||");
  if (parts.length >= 3) {
    return { app: parts[0], title: parts[1], body: parts[2] };
  }
  return null;
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
    const md =
      "# ⚠️ Error\n\nFailed to read notifications:\n\n```\n" + error + "\n```";
    return <Detail markdown={md} />;
  }

  if (notif === undefined) {
    return <Detail isLoading />;
  }

  if (notif === null) {
    return (
      <Detail markdown="# 🔔 No Notifications\n\nNotification Center is empty." />
    );
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
