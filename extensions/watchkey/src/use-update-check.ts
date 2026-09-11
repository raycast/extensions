import { showToast, Toast, open } from "@raycast/api";
import { useEffect, useRef } from "react";
import { platform } from "node:os";
import { checkForUpdate } from "./watchkey";

const RELEASES_URL =
  platform() === "win32"
    ? "https://github.com/Etheirystech/watchkey-win/releases/latest"
    : "https://github.com/Etheirystech/watchkey/releases/latest";

export function useUpdateCheck() {
  const checked = useRef(false);

  useEffect(() => {
    if (checked.current) return;
    checked.current = true;

    checkForUpdate().then(async (update) => {
      if (!update) return;
      await showToast({
        style: Toast.Style.Failure,
        title: `watchkey update available: v${update.latest}`,
        message: update.installed !== "unknown" ? `Installed: v${update.installed}` : undefined,
        primaryAction: {
          title: "Open GitHub",
          onAction: () => open(RELEASES_URL),
        },
      });
    });
  }, []);
}
