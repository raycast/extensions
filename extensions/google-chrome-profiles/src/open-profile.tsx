import { LaunchProps, showHUD } from "@raycast/api";
import { openGoogleChrome } from "./util/util";
import { Profile } from "./util/types";

export default async function Command(props: LaunchProps) {
  const profileDirectory = props.launchContext?.directory;
  const profileName = props.launchContext?.name;
  const action = props.launchContext?.action ?? "newTab";
  const url = props.launchContext?.url;

  const processName =
    action === "focus"
      ? `${profileName} > Bringing to Front`
      : action === "newTab"
      ? `${profileName} > Opening New Tab`
      : `${profileName} > Opening ${url}`;

  if (profileDirectory && profileName) {
    const profile: Profile = { directory: profileDirectory, name: profileName };
    await openGoogleChrome(profile, { action, url }, async () => {
      await showHUD(processName);
    });
  }

  return null;
}
