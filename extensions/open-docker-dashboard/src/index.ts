import { showHUD } from "@raycast/api";
import { runAppleScript } from "run-applescript";

export default async function main() {
  const isDockerRunning = await runAppleScript(checkDockerDesktopRunning);

  if (isDockerRunning === "NOT_RUNNING") {
    await showHUD("Docker desktop is not running. It will be start.");
  }

  const response = runAppleScript(startDokcerDashboardScript);
  console.log(await response);
}

const checkDockerDesktopRunning = `
tell application "System Events"
	if (get name of every application process) contains "Docker Desktop" then
    return "RUNNING"
	else
		return "NOT_RUNNING"
	end if
end tell
`;

const startDokcerDashboardScript = `
set applicationPath to POSIX path of "/Applications/Docker.app/Contents/MacOS/Docker Desktop.app/Contents/MacOS/Docker Desktop"

do shell script "open -a " & quoted form of applicationPath
`;
