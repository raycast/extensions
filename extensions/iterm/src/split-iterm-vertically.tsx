import { runAppleScript } from "run-applescript";
import { closeMainWindow, Detail, popToRoot, showToast, showHUD, Toast } from "@raycast/api";
import { isPermissionError, PermissionErrorScreen } from "./core/permission-error-screen";
import { useEffect, useState } from "react";

const scriptToSplitVertically = `
  on isAppRunning(appName)
    tell application "System Events" to (name of processes) contains appName
  end isAppRunning

  if isAppRunning("iTerm2") or isAppRunning("iTerm") then
    tell application "iTerm"
      activate
      repeat until application "iTerm" is running
          delay 0.1
      end repeat
      
      tell current session of current window
          split vertically with default profile
      end tell
      activate
    end tell
    return true
  else
    return "iTerm application is not running"
  end if`;

export default function Command() {
  const [hasPermissionError, setHasPermissionError] = useState<boolean>(false);

  const loadNewTab = () => {
    runAppleScript(scriptToSplitVertically)
      .then(async (status) => {
        if (status !== "true") {
          await showHUD(status);
        }

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
