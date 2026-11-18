import { Action, Tool } from "@raycast/api";
import { cancelCheckin, fetchActiveCheckin } from "../lib/media-mutations";
import { getToolSignal, toolTraktClient } from "./tool-client";

type Input = Record<string, never>;

type Output = {
  success: boolean;
  message: string;
  /** What was being watched, when a check-in was active. */
  stopped?: string;
};

export const confirmation: Tool.Confirmation<Input> = async () => {
  const active = await fetchActiveCheckin(toolTraktClient, { signal: getToolSignal() });
  if (!active) return undefined;

  return {
    style: Action.Style.Destructive,
    message: `Stop the check-in to ${active.title}?`,
    info: [
      { name: "Watching", value: active.title },
      { name: "What happens", value: "The check-in is cancelled and no play is recorded for it." },
    ],
  };
};

/**
 * Stop the active Trakt check-in ("Now Watching"), so it does not become a play.
 * Reports when nothing is being watched. A confirmation dialog is shown first when a check-in is active.
 */
export default async function tool(): Promise<Output> {
  const active = await fetchActiveCheckin(toolTraktClient, { signal: getToolSignal() });
  if (!active) return { success: false, message: "No check-in is active on Trakt, so there is nothing to stop." };

  await cancelCheckin(toolTraktClient, { signal: getToolSignal() });

  const after = await fetchActiveCheckin(toolTraktClient, { signal: getToolSignal() });
  if (after) throw new Error(`Trakt still shows a check-in to ${after.title}.`);

  return { success: true, message: `Stopped the check-in to ${active.title}.`, stopped: active.title };
}
