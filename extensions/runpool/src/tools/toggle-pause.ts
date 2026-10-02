import { Action, Tool } from "@raycast/api";
import { getStatus, runpool } from "../lib/runpool";

type Input = {
  /**
   * "pause" stands every pool down and stops them waking on queued jobs.
   * "resume" returns to normal on-demand behaviour.
   */
  action: "pause" | "resume";
};

/**
 * Confirm pausing, not resuming.
 *
 * Pausing is the one that surprises people later: RunPool jobs carry on queueing
 * that nothing will pick up, and there is no signal beyond the jobs sitting
 * there. Resuming only restores the default, so it needs no ceremony.
 */
export const confirmation: Tool.Confirmation<Input> = async (input) => {
  if (input.action === "resume") return undefined;

  const { paused } = await getStatus({ local: true });
  if (paused) return undefined;

  return {
    message:
      "Pause runner pools? Every RunPool runner stands down and pools stop waking on queued jobs. This does not affect Blacksmith or GitHub workflows.",
    style: Action.Style.Destructive,
  };
};

export default async function tool(input: Input) {
  const { paused } = await getStatus({ local: true });

  if (input.action === "pause" && paused) return "Runner pools are already paused.";
  if (input.action === "resume" && !paused) return "Runner pools are already running on demand.";

  await runpool([input.action]);
  return input.action === "pause"
    ? "Paused. Every runner is down and jobs will queue until you resume."
    : "Resumed. Pools wake on demand again, within about a minute of a job queueing.";
}
