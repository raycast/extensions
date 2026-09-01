import { Action, Tool } from "@raycast/api";
import { MINIMUM_RUNPOOL, getStatus, runpool, runpoolTooOld } from "../lib/runpool";

type Input = {
  /** The name of the pool to resize, as reported by get-status. */
  pool: string;
  /**
   * How many runners the pool should have. A positive whole number.
   *
   * More runners may not mean more throughput. A single test job commonly
   * forks one worker per CPU core, so several at once can oversubscribe the
   * machine rather than get through the work faster. That is the standard
   * argument rather than a measurement, and `runpool stats` is what settles
   * it for a given machine. If the user has not said what they want, ask
   * rather than guessing.
   */
  count: number;
};

/**
 * What the confirmation read, so the write can be refused if the pool moved
 * while the question sat open.
 *
 * `Tool.Confirmation` returns a message and nothing else, so there is no
 * argument to carry this in. Both halves run in this module, in order, which
 * makes a module-scoped note the only channel between them. It is treated as a
 * hint rather than a guarantee: if it is absent the fresh read below stands on
 * its own, and `--if-count` is doing the real work either way.
 */
let confirmed: { pool: string; count: number } | undefined;

/**
 * Always confirm. Growing registers new runners with GitHub and downloads the
 * runner binary; shrinking deregisters them, which is not undone by setting
 * the number back.
 */
export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const { pools } = await getStatus({ local: true });
  const pool = pools.find((p) => p.name === input.pool);
  const from = pool ? `${pool.count}` : "its current count";

  confirmed = pool ? { pool: input.pool, count: pool.count } : undefined;

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

  // The version gate lives in the requirements hook, which is a React hook that
  // only the view commands mount. An AI tool never renders anything, so it
  // reached the CLI without ever passing that check. This is the one command
  // where the difference is dangerous: `--if-count` is ignored rather than
  // rejected by older versions, so the resize below would read as guarded and
  // not be. Everything else this extension runs fails loudly on an old CLI.
  const outdated = runpoolTooOld();
  if (outdated) {
    throw new Error(
      `runpool ${outdated} is too old to resize safely. The guard that stops a resize acting on a stale count arrived in ${MINIMUM_RUNPOOL}, and older versions ignore it instead of refusing, so this change could deregister runners it was never meant to. Upgrade with: brew upgrade runpool`,
    );
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

  // The user agreed to a change framed by the count the confirmation read, and
  // `set-count` writes an absolute number rather than a difference. A question
  // sits open for as long as it takes to read, and the list command, another
  // window or a terminal can resize the pool in that time, which turns approved
  // growth into a shrink that deregisters runners nobody agreed to.
  const agreed = confirmed?.pool === pool.name ? confirmed.count : pool.count;
  confirmed = undefined;

  if (agreed !== pool.count) {
    throw new Error(
      `Pool "${pool.name}" was resized somewhere else while this was waiting: it had ${agreed} ${
        agreed === 1 ? "runner" : "runners"
      } and now has ${pool.count}. Nothing was changed. Ask again against the current figure.`,
    );
  }

  // `--if-count` is what settles it: runpool refuses the write unless the pool
  // is still where the decision was made, and holds a lock so two resizes
  // cannot interleave. The check above stays because it says something better
  // than a command failure when the pool has obviously moved.
  await runpool(["set-count", pool.name, String(input.count), "--if-count", String(pool.count)]);
  return `Pool "${pool.name}" now has ${input.count} runners, changed from ${pool.count}.`;
}
