import { Action, Tool } from "@raycast/api";
import { getStatus, runpool } from "../lib/runpool";

type Input = {
  /** The name of the pool to resize, as reported by get-status. */
  pool: string;
  /**
   * How many runners the pool should have. A positive whole number.
   *
   * More runners is not more throughput. A single test job commonly forks one
   * worker per CPU core, so several jobs at once can oversubscribe the machine
   * and make everything slower rather than faster. If the user has not said
   * what they want, ask rather than guessing.
   */
  count: number;
};

/**
 * Always confirm. Growing registers new runners with GitHub and downloads the
 * runner binary; shrinking deregisters them, which is not undone by setting
 * the number back.
 */
export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const { pools } = await getStatus({ local: true });
  const pool = pools.find((p) => p.name === input.pool);
  const from = pool ? `${pool.count}` : "its current count";

  const shrinking = pool !== undefined && input.count < pool.count;

  return {
    message: shrinking
      ? `Reduce pool "${input.pool}" from ${from} to ${input.count} runners? The surplus runners are deregistered from GitHub, not just stopped.`
      : `Change pool "${input.pool}" from ${from} to ${input.count} runners? New runners are registered with GitHub.`,
    style: shrinking ? Action.Style.Destructive : Action.Style.Regular,
    info: pool
      ? [
          { name: "Pool", value: `${pool.name} (${pool.scope} ${pool.target})` },
          { name: "Now", value: `${pool.count} runners, ${pool.running} up` },
          { name: "After", value: `${input.count} runners` },
        ]
      : undefined,
  };
};

export default async function tool(input: Input) {
  if (!Number.isInteger(input.count) || input.count < 1) {
    throw new Error(`Runner count must be a whole number of at least 1, not "${input.count}".`);
  }

  const { pools } = await getStatus({ local: true });
  const pool = pools.find((p) => p.name === input.pool);

  if (!pool) {
    throw new Error(`No pool named "${input.pool}". Available: ${pools.map((p) => p.name).join(", ") || "none"}.`);
  }
  if (pool.busy > 0) {
    throw new Error(
      `Pool "${pool.name}" has ${pool.busy} job${pool.busy === 1 ? "" : "s"} running. runpool refuses to resize a busy pool, because it would fail those jobs. Wait for them to finish.`,
    );
  }

  await runpool(["set-count", pool.name, String(input.count)]);
  return `Pool "${pool.name}" now has ${input.count} runners, changed from ${pool.count}.`;
}
