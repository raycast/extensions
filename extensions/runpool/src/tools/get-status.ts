import { getStatus, githubUnchecked, Pool, poolState, Status } from "../lib/runpool";

/**
 * The same judgement the pool list makes, so the model and the UI cannot
 * describe one pool two different ways.
 *
 * "Resting" is only true of a pool GitHub has confirmed it still knows about.
 * When the query could not be made, usually a missing or signed-out `gh`, the
 * github fields come back null, `unreachable` can never be reached, and a pool
 * whose registrations GitHub has pruned looks exactly like a healthy idle one.
 * Say so rather than let the model report health it has no evidence for.
 */
function describe(pool: Pool, status: Status): string {
  switch (poolState(pool, status.paused)) {
    case "paused":
      return status.paused ? "globally paused" : "paused until this pool is resumed";
    case "unreachable":
      return "not registered with GitHub, jobs will queue forever";
    case "active":
      return "running jobs";
    case "idle":
      return githubUnchecked(status) ? "up but idle, registration unverified" : "up but idle";
    case "offline":
      return githubUnchecked(status)
        ? "no runners up, but GitHub could not be asked so it is unknown whether this pool is still registered"
        : "resting, will wake when a job queues";
  }
}

/**
 * Read every runner pool.
 *
 * Returns the whole picture in one call rather than making the model ask again
 * for each pool: name, scope, how many runners are configured and running, jobs
 * in flight, what GitHub sees, and which repositories the pool serves.
 *
 * No confirmation: this changes nothing.
 */
export default async function tool() {
  const status = await getStatus();

  return {
    paused: status.paused,
    /**
     * False when the GitHub query could not be made. The github fields are
     * then null, and registration health is unknown rather than good.
     */
    githubChecked: !githubUnchecked(status),
    pools: status.pools.map((pool) => ({
      name: pool.name,
      scope: pool.scope,
      target: pool.target,
      runnersConfigured: pool.count,
      runnersUp: pool.running,
      jobsInFlight: pool.busy,
      paused: pool.paused,
      githubRegistered: pool.github_registered,
      githubOnline: pool.github_online,
      repositories: pool.scope === "org" ? pool.watch : [pool.target],
      // Spelled out so the model does not have to infer intent from zeroes.
      // A pool with no runners up is resting, which is the normal state for an
      // on-demand pool and is not a fault.
      state: describe(pool, status),
    })),
  };
}
