import { useEffect, useMemo, useState } from "react";
import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Detail,
  Icon,
  Keyboard,
  LaunchType,
  List,
  Toast,
  confirmAlert,
  launchCommand,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { cancelJob, listAllJobs, showJob, tailFile, type Job, type JobDetail } from "./lib/slurm";
import { consumeStreamChunk } from "./lib/logstream";
import { matchesQuery } from "./lib/search";
import { useActiveHosts, useSlurmUsers } from "./lib/session";
import { fetchPerCluster, type ClusterResult } from "./lib/multi";
import { ClusterAuthRow } from "./lib/components/ClusterAuthRow";
import { JobDetailView } from "./lib/components/JobDetailView";
import { showSshErrorToast } from "./lib/errors";
import {
  ClusterFilterDropdown,
  FILTER_ALL,
  applyClusterFilter,
  partitionsByCluster,
} from "./lib/components/ClusterFilter";
import { fitSubtitleToRow, gpuLabelFromTres, memFromTres, stateColor } from "./lib/format";

// A cluster-wide queue can hold many thousands of jobs. Instantiating a
// heavyweight <List.Item> (detail metadata + action panel) for every one at
// once exhausts the Raycast worker heap ("JS heap out of memory"). Render in
// bounded pages and let Raycast load more on scroll.
const PAGE_SIZE = 100;

export default function AllJobs() {
  const { hosts, isLoading: hostsLoading } = useActiveHosts();
  // Current user per cluster — used to decide which jobs we can stream live
  // metrics for (srun --overlap only works on your own allocation).
  const { users } = useSlurmUsers(hosts);
  const [filter, setFilter] = useState<string>(FILTER_ALL);
  const [searchText, setSearchText] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

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

  // Reset to the first page whenever the dataset, filter, or search changes.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [hostsKey, filter, searchText]);

  const partitionsPerCluster = useMemo(
    () => partitionsByCluster<Job>((results ?? []) as ClusterResult<Job[]>[], (j) => j.partition),
    [results],
  );

  const filtered = useMemo(
    () => applyClusterFilter<Job>((results ?? []) as ClusterResult<Job[]>[], filter, (j) => j.partition),
    [results, filter],
  );

  if (!hostsLoading && hosts.length === 0) return <NoHostView />;

  const isLoading = hostsLoading || jobsLoading;
  const allFailures = (results ?? []).filter((r) => !r.ok);
  const okClusters = filtered.filter((r): r is Extract<ClusterResult<Job[]>, { ok: true }> => r.ok);

  // We filter the full in-memory dataset ourselves (List filtering disabled) so
  // search spans every job, not just the currently-paginated rows. Flatten the
  // matches in cluster order, then slice to the visible page and regroup into
  // sections — this bounds how many List.Items exist in the tree at once.
  const flat: { host: string; job: Job }[] = [];
  const matchesPerHost = new Map<string, number>();
  for (const r of okClusters) {
    for (const job of r.data) {
      if (!matchesQuery(jobHaystack(r.host, job), searchText)) continue;
      flat.push({ host: r.host, job });
      matchesPerHost.set(r.host, (matchesPerHost.get(r.host) ?? 0) + 1);
    }
  }
  const totalJobs = flat.length;
  const shownByHost = new Map<string, Job[]>();
  for (const { host, job } of flat.slice(0, visibleCount)) {
    const arr = shownByHost.get(host);
    if (arr) arr.push(job);
    else shownByHost.set(host, [job]);
  }

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search jobs across clusters…"
      navigationTitle={hosts.length ? `All Jobs — ${hosts.join(", ")}` : "All Slurm Jobs"}
      pagination={{
        pageSize: PAGE_SIZE,
        hasMore: visibleCount < totalJobs,
        onLoadMore: () => setVisibleCount((c) => c + PAGE_SIZE),
      }}
      searchBarAccessory={
        <ClusterFilterDropdown tooltip="Filter" value={filter} onChange={setFilter} clusters={partitionsPerCluster} />
      }
    >
      {allFailures.map((r) =>
        !r.ok ? <ClusterAuthRow key={`err:${r.host}`} host={r.host} info={r.error} onReauth={revalidate} /> : null,
      )}

      {totalJobs === 0 && allFailures.length === 0 && !isLoading ? (
        <List.EmptyView title="No jobs" description="No jobs in any active cluster's queue." icon={Icon.Tray} />
      ) : null}

      {okClusters.map((r) => {
        const jobs = shownByHost.get(r.host);
        if (!jobs || jobs.length === 0) return null;
        return (
          <List.Section key={r.host} title={r.host} subtitle={`${matchesPerHost.get(r.host) ?? 0} jobs`}>
            {jobs.map((job) => (
              <AllJobItem
                key={`${r.host}:${job.jobId}`}
                job={job}
                host={r.host}
                meUser={users[r.host]}
                onCancelled={revalidate}
              />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}

// Fields the search bar matches against — mirrors the old List.Item `keywords`.
function jobHaystack(host: string, job: Job): string {
  return [host, job.jobId, job.partition, job.state, job.name, job.user ?? "", job.reasonOrNodeList].join(" ");
}

function AllJobItem({
  job,
  host,
  meUser,
  onCancelled,
}: {
  job: Job;
  host: string;
  meUser?: string;
  onCancelled: () => void;
}) {
  const { push } = useNavigation();
  const owned = !!job.user && !!meUser && job.user === meUser;

  const rowTexts = [job.jobId, job.partition, `${job.elapsed} / ${job.timeLimit}`, `${job.cpus} CPU`];
  const accessories: List.Item.Accessory[] = [
    { tag: { value: job.partition, color: Color.SecondaryText } },
    { text: `${job.elapsed} / ${job.timeLimit}` },
  ];
  if (job.user) {
    accessories.unshift({ tag: { value: job.user, color: Color.Blue } });
    rowTexts.push(job.user);
  }
  accessories.push({ text: `${job.cpus} CPU` });
  const mem = memFromTres(job.tres);
  if (mem) {
    accessories.push({ text: mem });
    rowTexts.push(mem);
  }
  const gpu = gpuLabelFromTres(job.tres);
  if (gpu) {
    accessories.push({ text: gpu });
    rowTexts.push(gpu);
  }

  return (
    <List.Item
      title={job.jobId}
      // The job name is the only element Raycast lets overflow, so truncate it
      // against the row's character budget (title + accessories). This keeps the
      // accessories (e.g. the GPU tag) visible and shortens the name instead.
      subtitle={fitSubtitleToRow(job.name, rowTexts)}
      keywords={[host, job.partition, job.state, job.name, job.user ?? "", job.reasonOrNodeList]}
      icon={{ source: Icon.Hammer, tintColor: stateColor(job.state) }}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action
            title="View Details"
            icon={Icon.Eye}
            onAction={() => push(<JobDetailView host={host} jobId={job.jobId} owned={owned} />)}
          />
          <Action
            title="Tail StdOut"
            icon={Icon.Terminal}
            shortcut={{ modifiers: ["cmd"], key: "t" }}
            onAction={async () => {
              const detail = await safeShowJob(host, job.jobId);
              const out = detail?.fields.StdOut;
              if (!out) {
                await showToast({ style: Toast.Style.Failure, title: "No StdOut path" });
                return;
              }
              push(<TailView host={host} path={out} title={`StdOut — ${job.jobId}`} />);
            }}
          />
          <Action
            title="Tail StdErr"
            icon={Icon.ExclamationMark}
            onAction={async () => {
              const detail = await safeShowJob(host, job.jobId);
              const errPath = detail?.fields.StdErr;
              if (!errPath) {
                await showToast({ style: Toast.Style.Failure, title: "No StdErr path" });
                return;
              }
              push(<TailView host={host} path={errPath} title={`StdErr — ${job.jobId}`} />);
            }}
          />
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Job ID"
              content={job.jobId}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
            <Action
              title="Cancel Job"
              icon={Icon.Stop}
              style={Action.Style.Destructive}
              shortcut={Keyboard.Shortcut.Common.Remove}
              onAction={async () => {
                const ok = await confirmAlert({
                  title: `Cancel job ${job.jobId} on ${host}?`,
                  message: job.name,
                  icon: Icon.Stop,
                  primaryAction: { title: "scancel", style: Alert.ActionStyle.Destructive },
                });
                if (!ok) return;
                try {
                  await cancelJob(host, job.jobId);
                  await showToast({ style: Toast.Style.Success, title: `Cancelled ${job.jobId}` });
                  onCancelled();
                } catch (err) {
                  await showSshErrorToast(err, host, `Cancel ${job.jobId}`);
                }
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

async function safeShowJob(host: string, jobId: string): Promise<JobDetail | null> {
  try {
    return await showJob(host, jobId);
  } catch (err) {
    await showSshErrorToast(err, host, `Job ${jobId}`);
    return null;
  }
}

function TailView({ host, path, title }: { host: string; path: string; title: string }) {
  const [lines, setLines] = useState<string[]>([]);
  const [stopped, setStopped] = useState(false);

  useEffect(() => {
    const proc = tailFile(host, path);
    let buffer = "";
    proc.stdout?.on("data", (chunk: Buffer) => {
      const { lines: parts, buffer: rest } = consumeStreamChunk(buffer, chunk.toString());
      buffer = rest;
      if (parts.length) setLines((prev) => [...prev, ...parts].slice(-500));
    });
    proc.stderr?.on("data", (chunk: Buffer) => {
      const text = chunk.toString().trim();
      if (text) setLines((prev) => [...prev, `[stderr] ${text}`].slice(-500));
    });
    proc.on("exit", () => setStopped(true));
    return () => {
      try {
        proc.kill("SIGTERM");
      } catch {
        /* ignore */
      }
    };
  }, [host, path]);

  const md = `# ${title}\n\n\`${path}\` on \`${host}\`\n\n\`\`\`\n${lines.join("\n") || "(waiting for output…)"}\n\`\`\``;
  return (
    <Detail
      isLoading={!stopped && lines.length === 0}
      markdown={md}
      navigationTitle={title}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Path" content={path} />
          <Action.CopyToClipboard title="Copy Buffered Output" content={lines.join("\n")} />
        </ActionPanel>
      }
    />
  );
}

function NoHostView() {
  return (
    <List>
      <List.EmptyView
        title="No active clusters"
        description="Select one or more clusters first."
        icon={Icon.Plug}
        actions={
          <ActionPanel>
            <Action
              title="Open Select Clusters"
              icon={Icon.List}
              onAction={() => launchCommand({ name: "select-cluster", type: LaunchType.UserInitiated })}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
