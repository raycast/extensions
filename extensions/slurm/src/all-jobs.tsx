import { useEffect, useMemo } from "react";
import { useCachedPromise } from "@raycast/utils";
import { listAllJobs, type Job } from "./lib/slurm";
import { useActiveHosts, useSlurmUsers } from "./lib/session";
import { fetchPerCluster } from "./lib/multi";
import { JobList } from "./lib/components/JobList";
import { NoHostView } from "./lib/components/NoHostView";

export default function AllJobs() {
  const { hosts, isLoading: hostsLoading } = useActiveHosts();
  // Current user per cluster — used to decide which jobs we can stream live
  // metrics for (srun --overlap only works on your own allocation).
  const { users } = useSlurmUsers(hosts);

  const hostsKey = useMemo(() => JSON.stringify(hosts), [hosts]);

  const {
    data: results,
    isLoading: jobsLoading,
    revalidate,
  } = useCachedPromise(
    async (key: string) => {
      const list = (JSON.parse(key) as string[]).filter(Boolean);
      return fetchPerCluster<Job[]>(list, (h) => listAllJobs(h));
    },
    [hostsKey],
    { execute: hosts.length > 0, keepPreviousData: true },
  );

  useEffect(() => {
    if (!hosts.length) return;
    const t = setInterval(() => revalidate(), 10_000);
    return () => clearInterval(t);
  }, [hostsKey, revalidate]);

  if (!hostsLoading && hosts.length === 0) return <NoHostView />;

  const isLoading = hostsLoading || jobsLoading;

  return (
    <JobList
      results={results}
      users={users}
      isLoading={isLoading}
      navigationTitle={hosts.length ? `All Jobs — ${hosts.join(", ")}` : "All Slurm Jobs"}
      emptyDescription="No jobs in any active cluster's queue."
      revalidate={revalidate}
      resetKey={hostsKey}
      includeUserTag
    />
  );
}
