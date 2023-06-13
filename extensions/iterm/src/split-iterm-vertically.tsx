import { runAppleScript } from "run-applescript";
import { closeMainWindow, Detail, popToRoot, showToast, Toast } from "@raycast/api";
import { isPermissionError, PermissionErrorScreen } from "./core/permission-error-screen";
import { useEffect, useState } from "react";

const scriptToSplitVertically = `
  tell application "iTerm"
    activate
    repeat until application "iTerm" is running
        delay 0.1
    end repeat
    
    tell current session of current window
        split vertically with default profile
    end tell
    activate
  end tell`;

export default function Command() {
  const [hasPermissionError, setHasPermissionError] = useState<boolean>(false);

  const loadNewTab = () => {
    runAppleScript(scriptToSplitVertically)
      .then(async () => {
        await closeMainWindow();
        await popToRoot();
      })
      .catch(async (e) => {
        if (isPermissionError(e.message)) {
          setHasPermissionError(true);
          return;
        }

        await showToast({
          style: Toast.Style.Failure,
          title: "Cannot split vertically",
          message: e.message,
        });
      });
  };

  useEffect(() => {
    loadNewTab();
  }, []);

  return (
    <>
      {hasPermissionError && <PermissionErrorScreen />}
      {!hasPermissionError && (
        <Detail isLoading={true} navigationTitle="Splitting iTerm..." markdown={"Splitting iTerm..."} />
      )}
    </>
  );
}
