import { LaunchProps, showHUD } from "@raycast/api";
import { ChromeTarget, openGoogleChrome } from "./util/util";
import { Profile } from "./util/types";

export default async function Command(props: LaunchProps) {
  const profileDirectory = props.launchContext?.directory;
  const profileName = props.launchContext?.name;
  const action = props.launchContext?.action ?? "newTab";
  const url = props.launchContext?.url;

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

  if (profileDirectory && profileName) {
    const profile: Profile = { directory: profileDirectory, name: profileName };
    await openGoogleChrome(profile, target, async () => {
      await showHUD(processName);
    });
  }

  return null;
}
