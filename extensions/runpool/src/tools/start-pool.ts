import { getStatus, runpool } from "../lib/runpool";

type Input = {
  /**
   * The name of the pool to start, as reported by get-status. This is the
   * pool's own short name such as "marfa", not the GitHub organisation or
   * repository it serves.
   */
  pool: string;
};

/**
 * Bring a pool's runners online now.
 *
 * Rarely necessary: a pool wakes on its own within about a minute of a job
 * queueing. Worth doing only to avoid that first wait, or after a pause.
 *
 * No confirmation. Starting runners is cheap and reversible, and they stand
 * themselves back down when idle.
 */
export default async function tool(input: Input) {
  const { paused, pools } = await getStatus({ local: true });
  const pool = pools.find((p) => p.name === input.pool);

  if (!pool) {
    throw new Error(`No pool named "${input.pool}". Available: ${pools.map((p) => p.name).join(", ") || "none"}.`);
  }
  if (paused) {
    throw new Error("RunPool is globally paused. Resume it with the global pause control before starting a pool.");
  }
  if (pool.paused) {
    throw new Error(`Pool "${pool.name}" is persistently paused. Resume that pool before starting it.`);
  }
  if (pool.running > 0) {
    return `Pool "${pool.name}" is already up with ${pool.running} of ${pool.count} runners.`;
  }

  await runpool(["up", pool.name]);
  return `Started pool "${pool.name}" with ${pool.count} runners.`;
}
