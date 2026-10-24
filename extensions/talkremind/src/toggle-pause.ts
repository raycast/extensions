import { getPreferenceValues } from "@raycast/api";
import { act, getState } from "./lib/client";
import { describePause, PRESETS } from "./lib/pause";
import { runCommand } from "./lib/ui";

export default async function Command() {
  const { pauseFor } = getPreferenceValues<Preferences.TogglePause>();
  await runCommand(async () => {
    if ((await getState()).paused) {
      await act({ cmd: "resume" });
      return "TalkRemind resumed";
    }
    const request = PRESETS.find((p) => p.id === pauseFor)?.request ?? { minutes: 30 };
    return describePause(await act({ cmd: "pause", ...request }));
  });
}
