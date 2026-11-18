import { LaunchProps } from "@raycast/api";
import FindProfile from "./components/FindProfile";

/**
 * Check which sites a username has a profile on. With no username, reopens the last search and its findings.
 */
export default function FindProfileCommand(props: LaunchProps<{ arguments: Arguments.FindProfile }>) {
  const profile = props.arguments.profile?.trim();
  return <FindProfile initialProfile={profile} searchOnOpen={Boolean(profile)} isRoot />;
}
