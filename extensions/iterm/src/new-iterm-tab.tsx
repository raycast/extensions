import { runAppleScript } from "run-applescript";
import { closeMainWindow, Detail, popToRoot, showToast, Toast } from "@raycast/api";
import { isPermissionError, PermissionErrorScreen } from "./core/permission-error-screen";
import { useEffect, useState } from "react";

const scriptToCreateNewTab = `
  tell application "iTerm"
    activate
    repeat until application "iTerm" is running
      delay 0.1
    end repeat
    
    if windows of application "iTerm" is {} then
      create window with default profile
    end if
  
    activate
    tell application "iTerm" to tell the first window to create tab with default profile
    activate
  end tell`;

export default function Command() {
  const [hasPermissionError, setHasPermissionError] = useState<boolean>(false);

  const loadNewTab = () => {
    runAppleScript(scriptToCreateNewTab)
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
          title: "Cannot create new iTerm tab",
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
        <Detail isLoading={true} navigationTitle="Creating iTerm Tab..." markdown={"Creating iTerm Tab..."} />
      )}
    </>
  );
}
