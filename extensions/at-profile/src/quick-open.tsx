import { LaunchProps } from "@raycast/api";
import { openProfileWithFeedback } from "./helpers/open-profile";
import { QuickOpenArguments } from "./types";

/**
 * Quick open command that directly opens a profile on a specified app. Works for hidden apps too: Quick Open's
 * app list is fixed in package.json, not driven by Manage Apps.
 */
export default async function QuickOpenCommand(props: LaunchProps<{ arguments: QuickOpenArguments }>) {
  const { profile, app } = props.arguments;
  await openProfileWithFeedback(profile, app);
}
