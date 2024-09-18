import { runAppleScript } from "run-applescript";
import { closeMainWindow, Detail, popToRoot, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { isPermissionError, PermissionErrorScreen } from "./core/permission-error-screen";

const scriptToCreateNewWindow = `
  tell application "iTerm"
    launch
    repeat until application "iTerm" is running
      delay 0.1
    end repeat
    
    create window with default profile
    activate
  end tell
`;

export default function Command() {
  const [hasPermissionError, setHasPermissionError] = useState<boolean>(false);

  const loadNewTab = () => {
    runAppleScript(scriptToCreateNewWindow)
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
          title: "Cannot create new iTerm window",
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
        <Detail isLoading={true} navigationTitle="Creating iTerm Window..." markdown={"Creating iTerm Window..."} />
      )}
    </>
  );
}
