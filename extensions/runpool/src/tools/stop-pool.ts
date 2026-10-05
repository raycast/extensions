import { Action, Tool } from "@raycast/api";
import { getStatus, runpool } from "../lib/runpool";

type Input = {
  /**
   * The name of the pool to stand down, as reported by get-status. The pool's
   * own short name such as "marfa", not the organisation or repository.
   */
  pool: string;
};

/**
 * Confirm before stopping, and say plainly when it will not work.
 *
 * runpool refuses to stand a pool down while a job is in flight, because
 * unloading the agent kills the job and it fails on GitHub seconds later with
 * nothing to explain why. Better to say that here than to let the model try
 * and report a confusing error.
 */
export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const { pools } = await getStatus({ local: true });
  const pool = pools.find((p) => p.name === input.pool);

  if (pool && pool.busy > 0) {
    return {
      message: `Pool "${input.pool}" has ${pool.busy} job${pool.busy === 1 ? "" : "s"} running. runpool will refuse to stop it, because stopping mid-job fails the job. Try anyway?`,
      style: Action.Style.Destructive,
    };
  }

  return {
    message: `Stand down pool "${input.pool}"? Its runners stay registered with GitHub and will wake again when a job queues.`,
  };
};

export default async function tool(input: Input) {
  const { pools } = await getStatus({ local: true });
  const pool = pools.find((p) => p.name === input.pool);

  if (!pool) {
    throw new Error(`No pool named "${input.pool}". Available: ${pools.map((p) => p.name).join(", ") || "none"}.`);
  }
  if (pool.running === 0) {
    return `Pool "${pool.name}" is already resting.`;
  }

  await runpool(["down", pool.name]);
  return `Stood down pool "${pool.name}". It stays registered and will wake when a job queues.`;
}
