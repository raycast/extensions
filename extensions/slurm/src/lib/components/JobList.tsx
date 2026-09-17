import { useEffect, useMemo, useState } from "react";
import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Detail,
  Icon,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { cancelJob, showJob, tailFile, type Job, type JobDetail } from "../slurm";
import { consumeStreamChunk } from "../logstream";
import { matchesQuery } from "../search";
import { type ClusterResult } from "../multi";
import { showSshErrorToast } from "../errors";
import { fitSubtitleToRow, gpuLabelFromTres, memFromTres, stateColor } from "../format";
import { jobHaystack } from "../jobs";
import { ClusterAuthRow } from "./ClusterAuthRow";
import { JobDetailView } from "./JobDetailView";
import { ClusterFilterDropdown, FILTER_ALL, applyClusterFilter, partitionsByCluster } from "./ClusterFilter";

// A cluster-wide queue can hold many thousands of jobs. Instantiating a
// heavyweight <List.Item> for every one at once exhausts the Raycast worker heap.
const PAGE_SIZE = 100;

type JobListProps = {
  results: ClusterResult<Job[]>[] | undefined;
  users?: Record<string, string>;
  isLoading: boolean;
  revalidate: () => void;
  resetKey: string;
  navigationTitle: string;
  emptyDescription: string;
  includeUserTag?: boolean;
};

export function JobList({
  results,
  users = {},
  isLoading,
  revalidate,
  resetKey,
  navigationTitle,
  emptyDescription,
  includeUserTag = false,
}: JobListProps) {
  const [filter, setFilter] = useState<string>(FILTER_ALL);
  const [searchText, setSearchText] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const partitionsPerCluster = useMemo(
    () => partitionsByCluster<Job>((results ?? []) as ClusterResult<Job[]>[], (job) => job.partition),
    [results],
  );

  const filtered = useMemo(
    () => applyClusterFilter<Job>((results ?? []) as ClusterResult<Job[]>[], filter, (job) => job.partition),
    [results, filter],
  );

  // Reset to the first page whenever the dataset, filter, or search changes.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [resetKey, filter, searchText]);

  const allFailures = (results ?? []).filter((result) => !result.ok);
  const okClusters = filtered.filter((result): result is Extract<ClusterResult<Job[]>, { ok: true }> => result.ok);
  const { matchesPerHost, shownByHost, totalJobs } = paginateJobs(okClusters, searchText, visibleCount);

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search jobs across clusters…"
      navigationTitle={navigationTitle}
      pagination={{
        pageSize: PAGE_SIZE,
        hasMore: visibleCount < totalJobs,
        onLoadMore: () => setVisibleCount((count) => count + PAGE_SIZE),
      }}
      searchBarAccessory={
        <ClusterFilterDropdown tooltip="Filter" value={filter} onChange={setFilter} clusters={partitionsPerCluster} />
      }
    >
      {allFailures.map((result) =>
        !result.ok ? (
          <ClusterAuthRow key={`err:${result.host}`} host={result.host} info={result.error} onReauth={revalidate} />
        ) : null,
      )}

      {totalJobs === 0 && allFailures.length === 0 && !isLoading ? (
        <List.EmptyView title="No jobs" description={emptyDescription} icon={Icon.Tray} />
      ) : null}

      {okClusters.map((result) => {
        const jobs = shownByHost.get(result.host);
        if (!jobs || jobs.length === 0) return null;
        return (
          <List.Section key={result.host} title={result.host} subtitle={`${matchesPerHost.get(result.host) ?? 0} jobs`}>
            {jobs.map((job) => (
              <JobItem
                key={`${result.host}:${job.jobId}`}
                job={job}
                host={result.host}
                owned={isOwnedJob(result.host, job, users, includeUserTag)}
                includeUserTag={includeUserTag}
                keywords={jobKeywords(result.host, job, includeUserTag)}
                onCancelled={revalidate}
              />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}

function paginateJobs(
  clusters: Array<Extract<ClusterResult<Job[]>, { ok: true }>>,
  searchText: string,
  visibleCount: number,
): {
  matchesPerHost: Map<string, number>;
  shownByHost: Map<string, Job[]>;
  totalJobs: number;
} {
  const flat: { host: string; job: Job }[] = [];
  const matchesPerHost = new Map<string, number>();
  for (const result of clusters) {
    for (const job of result.data) {
      if (!matchesQuery(jobHaystack(result.host, job), searchText)) continue;
      flat.push({ host: result.host, job });
      matchesPerHost.set(result.host, (matchesPerHost.get(result.host) ?? 0) + 1);
    }
  }

  const shownByHost = new Map<string, Job[]>();
  for (const { host, job } of flat.slice(0, visibleCount)) {
    const jobs = shownByHost.get(host);
    if (jobs) jobs.push(job);
    else shownByHost.set(host, [job]);
  }
  return { matchesPerHost, shownByHost, totalJobs: flat.length };
}

function isOwnedJob(host: string, job: Job, users: Record<string, string>, includeUserTag: boolean): boolean {
  if (!includeUserTag) return true;
  return !!job.user && !!users[host] && job.user === users[host];
}

function jobKeywords(host: string, job: Job, includeUserTag: boolean): string[] {
  return includeUserTag
    ? [host, job.partition, job.state, job.name, job.user ?? "", job.reasonOrNodeList]
    : [host, job.partition, job.state, job.name, job.reasonOrNodeList];
}

function JobItem({
  job,
  host,
  owned,
  includeUserTag,
  keywords,
  onCancelled,
}: {
  job: Job;
  host: string;
  owned: boolean;
  includeUserTag: boolean;
  keywords: string[];
  onCancelled: () => void;
}) {
  const { push } = useNavigation();
  const rowTexts = [job.jobId, job.partition, `${job.elapsed} / ${job.timeLimit}`, `${job.cpus} CPU`];
  const accessories: List.Item.Accessory[] = [
    { tag: { value: job.partition, color: Color.SecondaryText } },
    { text: `${job.elapsed} / ${job.timeLimit}` },
  ];

  if (includeUserTag && job.user) {
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
      // against the row's character budget. This keeps GPU tags visible.
      subtitle={fitSubtitleToRow(job.name, rowTexts)}
      keywords={keywords}
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
