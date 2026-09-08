import { Action, Tool } from "@raycast/api";
import { getStatus, runpool } from "../lib/runpool";

type Input = {
  /** The pool's short name, as returned by get-status. */
  pool: string;
};

/** Pausing one pool persists until it is explicitly resumed. */
export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const { pools } = await getStatus({ local: true });
  const pool = pools.find((candidate) => candidate.name === input.pool);

  return {
    message: pool
      ? `Pause pool "${pool.name}"? Its runners stand down and it stops waking for queued work. Other pools are unchanged.`
      : `Pause pool "${input.pool}"?`,
    style: Action.Style.Destructive,
  };
};

export default async function tool(input: Input) {
  const { paused, pools } = await getStatus({ local: true });
  if (paused) {
    throw new Error("RunPool is globally paused. Use the global pause control before changing an individual pool.");
  }
  const pool = pools.find((candidate) => candidate.name === input.pool);
  if (!pool)
    throw new Error(`No pool named "${input.pool}". Available: ${pools.map((p) => p.name).join(", ") || "none"}.`);
  if (pool.paused) return `Pool "${pool.name}" is already paused.`;
  if (pool.busy > 0) {
    throw new Error(
      `Pool "${pool.name}" has ${pool.busy} job${pool.busy === 1 ? "" : "s"} running. Wait for it to finish before pausing.`,
    );
  }

  await runpool(["pause", pool.name]);
  return `Paused pool "${pool.name}". It will not wake until resumed.`;
}
