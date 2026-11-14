import { Tool } from "@raycast/api";
import { act } from "../lib/client";
import { describePause } from "../lib/pause";

type Input = {
  /** Minutes to pause for, 1 to 10080 (7 days). Leave out when using `until` or `indefinitely`. */
  minutes?: number;
  /** A named end: "evening" (20:00 today) or "tomorrow-morning" (07:00). Leave out when using `minutes` or `indefinitely`. */
  until?: "evening" | "tomorrow-morning";
  /** True to pause until further notice. Leave out when using `minutes` or `until`. */
  indefinitely?: boolean;
};

const length = ({ minutes, until, indefinitely }: Input) =>
  indefinitely ? "until further notice" : until ? `until ${until.replace("-", " ")}` : `for ${minutes} minutes`;

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: `Pause TalkRemind ${length(input)}? It will not remind you to dictate meanwhile.`,
});

export default async function tool({ minutes, until, indefinitely }: Input) {
  const state = await act({
    cmd: "pause",
    minutes,
    preset: until === "tomorrow-morning" ? "tomorrow" : until,
    indefinitely,
  });
  return `${describePause(state)}.`;
}
