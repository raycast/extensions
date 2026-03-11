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

  const target: ChromeTarget =
    action === "focus"
      ? { action: "focus" }
      : action === "openUrl" && url
      ? { action: "openUrl", url }
      : { action: "newTab" };

  const processName =
    target.action === "focus"
      ? `${profileName} > Bringing to Front`
      : target.action === "newTab"
      ? `${profileName} > Opening New Tab`
      : `${profileName} > Opening ${target.url}`;

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
