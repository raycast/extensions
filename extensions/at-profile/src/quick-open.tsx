import { LaunchProps } from "@raycast/api";
import { openProfile } from "./utils/open-profile";

export default async function QuickOpenCommand(props: LaunchProps<{ arguments: Arguments.QuickOpen }>) {
  const { profile, site } = props.arguments;

  // Simply open the profile with the selected site
  await openProfile(profile, site);
}
