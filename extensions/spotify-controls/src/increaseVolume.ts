import { buildScriptEnsuringSpotifyIsRunning, runAppleScriptSilently } from "./utils";
import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "./types";

interface CommandArguments {
  step?: string;
}

export default async function Command(props: { arguments: CommandArguments }) {
  const preferences = getPreferenceValues<Preferences>();
  const volumeStep = props.arguments.step
    ? parseInt(props.arguments.step)
    : isNaN(parseInt(preferences.volumeStep))
      ? 10
      : parseInt(preferences.volumeStep);

  const script = buildScriptEnsuringSpotifyIsRunning(`set sound volume to sound volume + ${volumeStep}`);
  await runAppleScriptSilently(script);
}
