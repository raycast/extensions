import { environment, popToRoot } from "@raycast/api";
import { spawn } from "node:child_process";
import { join } from "node:path";
import { useEffect } from "react";

export function useResetOnDismiss() {
  useEffect(() => {
    if (process.platform !== "darwin") return;

    let disposed = false;
    let output = "";
    const watcher = spawn(
      "/usr/bin/osascript",
      ["-l", "JavaScript", join(environment.assetsPath, "watch-quick-translate-window.js"), String(process.pid)],
      { stdio: ["ignore", "pipe", "pipe"] },
    );

    watcher.stdout.setEncoding("utf8");
    watcher.stdout.on("data", (chunk: string) => {
      output += chunk;
      if (!disposed && output.includes("closed\n")) {
        disposed = true;
        // Dismissal normally retains the view until Raycast's global timeout.
        // Unload it so the next launch reads the current selection again.
        popToRoot({ clearSearchBar: true }).catch((error: unknown) => {
          console.error("Could not reset Quick Translate after dismissal:", error);
        });
      }
    });
    watcher.stderr.on("data", (chunk: Buffer) => console.error(String(chunk)));
    watcher.on("error", (error) => console.error("Could not watch the Quick Translate window:", error));

    return () => {
      disposed = true;
      watcher.kill();
    };
  }, []);
}
