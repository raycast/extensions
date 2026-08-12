import { LaunchProps, showHUD, showToast, Toast } from "@raycast/api";
import { ChromeTarget, openGoogleChrome } from "./util/util";
import { getSelectedBrowser, Profile } from "./util/types";

export default async function Command(props: LaunchProps) {
  const browser = getSelectedBrowser();
  const profileDirectory = props.launchContext?.directory;
  const profileName = props.launchContext?.name;
  const action = props.launchContext?.action ?? "newTab";
  const url = props.launchContext?.url;

  if (!profileDirectory || !profileName) {
    await showToast(
      Toast.Style.Failure,
      "No profile context provided",
      "This command is meant to be launched via a Quicklink. Use 'Switch Profiles' to create one.",
    );
    return null;
  }

  let target: ChromeTarget;
  let processName: string;

  switch (action) {
    case "focus":
      target = { action: "focus" };
      processName = `${profileName} > Bringing to Front`;
      break;
    case "newWindow":
      target = { action: "newWindow" };
      processName = `${profileName} > Opening New Window`;
      break;
    case "openUrl":
      if (url) {
        target = { action: "openUrl", url };
        processName = `${profileName} > Opening ${url}`;
        break;
      }
    // falls through to newTab if no url
    default:
      target = { action: "newTab" };
      processName = `${profileName} > Opening New Tab`;
      break;
  }

  const profile: Profile = { directory: profileDirectory, name: profileName };
  await openGoogleChrome(
    profile,
    target,
    async () => {
      await showHUD(processName);
    },
    browser,
  );

  return null;
}
