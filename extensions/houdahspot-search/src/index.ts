import { closeMainWindow, showToast, getApplications, Toast } from "@raycast/api";
import { runAppleScript } from "run-applescript";

interface SearchArguments {
  searchTerm: string;
}

export default async function main(props: { arguments: SearchArguments }) {
  try {
    // Check if HoudahSpot is installed, if it is, open it search
    const installedApplications = await getApplications();
    const houdahspot = installedApplications.find((app) => app.name === "HoudahSpot");
    const { searchTerm } = props.arguments;
    console.log(searchTerm);

    if (houdahspot) {
      await closeMainWindow();
      await runAppleScript(`
        tell application "HoudahSpot"
          if it is not running then launch
          activate
          search "${searchTerm}"
        end tell
    `);
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "HoudahSpot App is not installed",
      });
      return;
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error :(",
    });
    return;
  }
}
