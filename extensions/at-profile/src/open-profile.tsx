import { LaunchProps } from "@raycast/api";
import OpenProfileForm from "./forms/open-profile-form";

/**
 * Main command component for opening profiles on social apps
 */
export default function OpenProfileCommand(props: LaunchProps<{ arguments: { profile?: string } }>) {
  return <OpenProfileForm initialProfile={props.arguments?.profile} />;
}
