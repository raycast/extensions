import { getStatus } from "../lib/runpool";

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
    pools: status.pools.map((pool) => ({
      name: pool.name,
      scope: pool.scope,
      target: pool.target,
      runnersConfigured: pool.count,
      runnersUp: pool.running,
      jobsInFlight: pool.busy,
      githubRegistered: pool.github_registered,
      githubOnline: pool.github_online,
      repositories: pool.scope === "org" ? pool.watch : [pool.target],
      // Spelled out so the model does not have to infer intent from zeroes.
      // A pool with no runners up is resting, which is the normal state for an
      // on-demand pool and is not a fault.
      state: status.paused
        ? "paused"
        : pool.github_registered === 0
          ? "not registered with GitHub, jobs will queue forever"
          : pool.busy > 0
            ? "running jobs"
            : pool.running > 0
              ? "up but idle"
              : "resting, will wake when a job queues",
    })),
  };
}
