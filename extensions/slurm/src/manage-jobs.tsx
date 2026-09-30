import { useEffect, useMemo } from "react";
import { updateCommandMetadata } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { listJobs, type Job } from "./lib/slurm";
import { useActiveHosts, useSlurmUsers } from "./lib/session";
import { fetchPerCluster } from "./lib/multi";
import { JobList } from "./lib/components/JobList";
import { NoHostView } from "./lib/components/NoHostView";
import { countByState, formatCounts } from "./lib/jobs";

export default function ManageJobs() {
  const { hosts, isLoading: hostsLoading } = useActiveHosts();
  const { users, isLoading: usersLoading } = useSlurmUsers(hosts);

  const usersKey = useMemo(() => JSON.stringify(hosts.map((h) => [h, users[h] ?? ""])), [hosts, users]);
  const ready = hosts.length > 0 && hosts.every((h) => !!users[h]);

  const {
    data: results,
    isLoading: jobsLoading,
    revalidate,
  } = useCachedPromise(
    async (key: string) => {
      const pairs = JSON.parse(key) as Array<[string, string]>;
      const list = pairs.map(([h]) => h).filter(Boolean);
      return fetchPerCluster<Job[]>(list, (h) => listJobs(h, users[h] ?? ""));
    },
    [usersKey],
    { execute: ready, keepPreviousData: true },
  );

  useEffect(() => {
    if (!ready) return;
    const t = setInterval(() => revalidate(), 10_000);
    return () => clearInterval(t);
  }, [ready, usersKey, revalidate]);

  // Aggregate command subtitle — derived in render so we can key the side
  // effect on the *string*, not on the upstream object refs which churn
  // every revalidation tick even when the displayed value is unchanged.
  const subtitle = useMemo(() => {
    if (!hosts.length) return "";
    const all = (results ?? []).flatMap((r) => (r.ok ? r.data : []));
    return `${hosts.join(",")} — ${formatCounts(countByState(all))}`;
  }, [hosts, results]);

  useEffect(() => {
    void updateCommandMetadata({ subtitle });
  }, [subtitle]);

  if (!hostsLoading && hosts.length === 0) {
    return <NoHostView />;
  }

  const isLoading = hostsLoading || usersLoading || jobsLoading;

  return (
    <JobList
      results={results}
      isLoading={isLoading}
      navigationTitle={hosts.length ? `My Jobs — ${hosts.join(", ")}` : "My Jobs"}
      emptyDescription="No queued or running jobs on any active cluster."
      revalidate={revalidate}
      resetKey={usersKey}
    />
  );
}
