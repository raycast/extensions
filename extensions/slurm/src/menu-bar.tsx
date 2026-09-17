import { useEffect, useMemo } from "react";
import { Color, Icon, LaunchType, MenuBarExtra, launchCommand } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { listJobsBrief, type Job } from "./lib/slurm";
import { useActiveHosts, useSlurmUsers } from "./lib/session";
import { fetchPerCluster } from "./lib/multi";
import { openMasterInTerminal } from "./lib/ssh";
import { countByState, formatMenuTitle } from "./lib/jobs";

export default function MenuBar() {
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
      return fetchPerCluster<Job[]>(list, (h) => listJobsBrief(h, users[h] ?? ""));
    },
    [usersKey],
    { execute: ready, keepPreviousData: true },
  );

  // Only ticks while the dropdown is open (Raycast suspends the menu-bar process
  // otherwise). Background refresh of the title/color is driven by the manifest
  // `interval`, which Raycast caps at a 1-minute minimum.
  useEffect(() => {
    if (!ready) return;
    const t = setInterval(() => revalidate(), 20_000);
    return () => clearInterval(t);
  }, [ready, usersKey, revalidate]);

  const clusters = results ?? [];
  const allJobs = clusters.flatMap((r) => (r.ok ? r.data : []));
  const counts = countByState(allJobs);
  const title = formatMenuTitle(counts);
  const anyError = clusters.some((r) => !r.ok);
  const tint = pickTint(counts, anyError);
  const hostsLabel = hosts.length > 0 ? hosts.join(", ") : "no cluster";
  const isLoading = hostsLoading || usersLoading || jobsLoading;

  if (!hostsLoading && hosts.length === 0) {
    return (
      <MenuBarExtra
        icon={{ source: Icon.Plug, tintColor: Color.SecondaryText }}
        title="Slurm"
        tooltip="No active clusters"
      >
        <MenuBarExtra.Item
          title="Select Clusters…"
          icon={Icon.List}
          onAction={() => launchCommand({ name: "select-cluster", type: LaunchType.UserInitiated })}
        />
      </MenuBarExtra>
    );
  }

  return (
    <MenuBarExtra
      icon={{ source: Icon.CircleFilled, tintColor: tint }}
      title={title}
      tooltip={`Slurm @ ${hostsLabel}`}
      isLoading={isLoading}
    >
      {clusters.map((r) => (
        <MenuBarExtra.Section key={r.host} title={r.host}>
          {r.ok ? (
            <>
              <MenuBarExtra.Item title={`Summary — ${formatMenuTitle(countByState(r.data))}`} icon={Icon.BarChart} />
              {renderJobsSubsection("Running", r.data, "RUNNING")}
              {renderJobsSubsection("Pending", r.data, "PENDING")}
              {renderJobsSubsection("Completing", r.data, "COMPLETING")}
            </>
          ) : (
            <>
              <MenuBarExtra.Item
                title={r.error.title}
                subtitle={r.error.hint ?? r.error.message}
                icon={
                  r.error.kind === "auth"
                    ? { source: Icon.LockUnlocked, tintColor: Color.Yellow }
                    : { source: Icon.ExclamationMark, tintColor: Color.Red }
                }
              />
              <MenuBarExtra.Item
                title={r.error.kind === "auth" ? "Reauthenticate in Terminal" : "Open in Terminal"}
                icon={r.error.kind === "auth" ? Icon.Key : Icon.Terminal}
                onAction={async () => {
                  try {
                    await openMasterInTerminal(r.host);
                    revalidate();
                  } catch (err) {
                    await showFailureToast(err instanceof Error ? err.message : String(err), {
                      title: `Couldn't open Terminal for ${r.host}`,
                    });
                  }
                }}
              />
            </>
          )}
        </MenuBarExtra.Section>
      ))}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open My Jobs"
          icon={Icon.List}
          onAction={() => launchCommand({ name: "manage-jobs", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          title="Select Clusters…"
          icon={Icon.Repeat}
          onAction={() => launchCommand({ name: "select-cluster", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item title="Refresh" icon={Icon.ArrowClockwise} onAction={() => revalidate()} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

function renderJobsSubsection(label: string, jobs: Job[], state: string) {
  const filtered = jobs.filter((j) => j.state === state).slice(0, 5);
  if (filtered.length === 0) return null;
  return (
    <>
      <MenuBarExtra.Item title={`${label} (${jobs.filter((j) => j.state === state).length})`} icon={Icon.Dot} />
      {filtered.map((j) => (
        <MenuBarExtra.Item
          key={j.jobId}
          title={`  ${j.jobId} — ${j.name}`}
          subtitle={`${j.partition} · ${j.elapsed}/${j.timeLimit}`}
          onAction={() => launchCommand({ name: "manage-jobs", type: LaunchType.UserInitiated })}
        />
      ))}
    </>
  );
}

function pickTint(counts: Record<string, number>, hasError: boolean): Color {
  if (hasError) return Color.Red;
  if (counts.FAILED || counts.TIMEOUT) return Color.Red;
  if (counts.RUNNING) return Color.Green;
  if (counts.PENDING) return Color.Yellow;
  return Color.SecondaryText;
}
