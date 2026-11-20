import { LaunchProps, showHUD } from "@raycast/api";
import { openLittleChrome, toUrl } from "./open-little-chrome";
import { preferredProfile, resolveProfile } from "./profile";

export default async function Command(props: LaunchProps<{ arguments: Arguments.OpenUrl }>) {
  const query = props.arguments.profile?.trim();
  const profile = resolveProfile(query);
  if (!profile) {
    await showHUD(`Chrome profile "${query || preferredProfile()}" not found`);
    return;
  }
  await openLittleChrome(toUrl(props.arguments.url), profile);
}
