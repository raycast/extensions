import { LaunchProps } from "@raycast/api";
import { openProfile } from "./helpers/open-profile";
import { QuickOpenArguments } from "./types";

export default async function QuickOpenCommand(props: LaunchProps<{ arguments: QuickOpenArguments }>) {
  const { profile, site } = props.arguments;

  // Open the profile with the selected site, bypassing manage apps settings
  // since Quick Open uses a hardcoded list and should work regardless of disabled apps
  await openProfile(profile, site, true, true);
}
