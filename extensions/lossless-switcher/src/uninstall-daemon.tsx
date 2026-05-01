import { useEffect } from "react";
import {
  Alert,
  Detail,
  Toast,
  closeMainWindow,
  confirmAlert,
  showHUD,
  showToast,
} from "@raycast/api";
import { uninstall } from "./lib/daemon";

export default function UninstallDaemon() {
  useEffect(() => {
    (async () => {
      const ok = await confirmAlert({
        title: "Uninstall daemon?",
        message:
          "This stops the background watcher, removes the LaunchAgent, and deletes cached data. The Raycast extension will stop functioning until reinstalled.",
        primaryAction: {
          title: "Uninstall",
          style: Alert.ActionStyle.Destructive,
        },
      });
      if (!ok) {
        await closeMainWindow();
        return;
      }
      const result = await uninstall();
      if (result.failures.length === 0) {
        await showHUD(
          "Daemon uninstalled — you can now remove the extension from Raycast",
        );
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Uninstall completed with issues",
          message: result.failures
            .map((f) => `${f.path}: ${f.error}`)
            .join("; "),
        });
      }
      await closeMainWindow();
    })();
  }, []);

  return <Detail markdown="### Removing the daemon…" />;
}
