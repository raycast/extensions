import { getPreferenceValues, LaunchProps } from "@raycast/api";
import { launchWithSelection } from "./launch";

export default async function Command(props: LaunchProps<{ arguments: Arguments.Reply }>) {
  // A setting of this command: only this command can read it, so it travels with the request.
  const { replyLanguage } = getPreferenceValues<Partial<Preferences.Reply>>();
  await launchWithSelection("reply", props.arguments.text, { replyLanguage: replyLanguage ?? "match" });
}
