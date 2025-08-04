import { LaunchProps } from "@raycast/api";
import { openProfile } from "./helpers/open-profile";
import { QuickOpenArguments } from "./types";

export default async function QuickOpenCommand(props: LaunchProps<{ arguments: QuickOpenArguments }>) {
  const { profile, app } = props.arguments;

  // Open the profile with the selected app, bypassing manage apps settings
  // since Quick Open uses a hardcoded list and should work regardless of disabled apps
  await openProfile(profile, app, true, true);
}
