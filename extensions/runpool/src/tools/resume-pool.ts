import { getStatus, runpool } from "../lib/runpool";

type Input = {
  /** The pool's short name, as returned by get-status. */
  pool: string;
};

export default async function tool(input: Input) {
  const { paused, pools } = await getStatus({ local: true });
  if (paused) {
    throw new Error("RunPool is globally paused. Use the global pause control before changing an individual pool.");
  }
  const pool = pools.find((candidate) => candidate.name === input.pool);
  if (!pool)
    throw new Error(`No pool named "${input.pool}". Available: ${pools.map((p) => p.name).join(", ") || "none"}.`);
  if (!pool.paused) return `Pool "${pool.name}" is not paused.`;

  await runpool(["resume", pool.name]);
  return `Resumed pool "${pool.name}". It will wake when work is queued.`;
}
