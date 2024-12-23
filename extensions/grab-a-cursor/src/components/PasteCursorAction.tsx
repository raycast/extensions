import {
  Action,
  Icon,
  getApplications,
  Application,
  Image,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { CursorItem } from "../types/cursor";
import { execSync } from "child_process";

interface PasteCursorActionProps {
  cursor: CursorItem;
}

export function PasteCursorAction({ cursor }: PasteCursorActionProps) {
  const [activeApp, setActiveApp] = useState<Application | null>(null);
  const [appIcon, setAppIcon] = useState<Image.ImageLike | null>(null);

  useEffect(() => {
    async function detectActiveApp() {
      try {
        // Get the foremost app using AppleScript
        const script = `osascript -e '
          tell application "System Events"
            set frontApp to first application process whose frontmost is true
            set appName to name of frontApp
            set appId to bundle identifier of frontApp
            return {appName & "," & appId}
          end tell'`;

        const result = execSync(script).toString().trim();
        const [appName, bundleId] = result.split(",");

        // Get all applications
        const allApps = await getApplications();

        // Find the foremost app in the list of all apps
        const foremostApp = allApps.find(
          (app) =>
            app.name === appName || (bundleId && app.bundleId === bundleId),
        );

        if (foremostApp) {
          setActiveApp(foremostApp);
          setAppIcon({ fileIcon: foremostApp.path });
        } else {
          console.warn("Could not find the foremost application:", {
            appName,
            bundleId,
          });
          setAppIcon(Icon.AppWindow);
        }
      } catch (error) {
        console.error("Failed to detect active application:", error);
        setAppIcon(Icon.AppWindow);
      }
    }

    detectActiveApp();
  }, []);

  return (
    <Action.Paste
      title={`Paste in ${activeApp?.name || "Active App"}`}
      content={cursor.content}
      icon={appIcon || Icon.Clipboard}
      shortcut={{ modifiers: ["cmd"], key: "return" }}
    />
  );
}
