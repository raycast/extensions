import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  showToast,
  Toast,
  Keyboard,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { readFileSync } from "fs";
import { LOG_PATH } from "./lib/config";
import { restartService } from "./lib/service";

function readRecentLogs(lines: number = 50): string {
  try {
    const content = readFileSync(LOG_PATH, "utf-8");
    const allLines = content.split("\n");
    return allLines.slice(-lines).join("\n");
  } catch {
    return "No log file found at " + LOG_PATH;
  }
}

export default function ViewLogs() {
  const [logs, setLogs] = useState<string>("");

  function reload() {
    setLogs(readRecentLogs());
  }

  useEffect(() => {
    reload();
  }, []);

  const markdown = "```\n" + logs + "\n```";

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            icon={Icon.ArrowClockwise}
            title="Refresh Logs"
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={reload}
          />
          <Action
            icon={Icon.RotateAntiClockwise}
            title="Restart Switcheroo"
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            onAction={async () => {
              try {
                restartService();
                await showToast({
                  style: Toast.Style.Success,
                  title: "Switcheroo restarted",
                });
                setTimeout(reload, 2000);
              } catch (e) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Failed to restart",
                  message: String(e),
                });
              }
            }}
          />
          <Action.CopyToClipboard title="Copy Logs" content={logs} />
        </ActionPanel>
      }
    />
  );
}
