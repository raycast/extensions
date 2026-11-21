import { getPreferenceValues, LaunchProps } from "@raycast/api";
import { lockInput } from "./lib/input-lock";

export default async function Command(props: LaunchProps<{ arguments: Arguments.Lock }>) {
  const { blockTrackpad } = getPreferenceValues<Preferences.Lock>();
  await lockInput({ blockPointer: blockTrackpad, duration: props.arguments.duration });
}
