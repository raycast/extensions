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
  updateCommandMetadata,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { cancelJob, listJobs, showJob, tailFile, type Job, type JobDetail } from "./lib/slurm";
import { useActiveHosts, useSlurmUsers } from "./lib/session";
import { fetchPerCluster, type ClusterResult } from "./lib/multi";
import { ClusterAuthRow } from "./lib/components/ClusterAuthRow";
import { classifySshError, showSshErrorToast } from "./lib/errors";
import {
  ClusterFilterDropdown,
  FILTER_ALL,
  applyClusterFilter,
  partitionsByCluster,
} from "./lib/components/ClusterFilter";
import {
  formatSlurmDateTime,
  formatSlurmDuration,
  gpuLabelFromTres,
  memFromTres,
  shortReason,
  stateColor,
} from "./lib/format";

export default function ManageJobs() {
  const { hosts, isLoading: hostsLoading } = useActiveHosts();
  const { users, isLoading: usersLoading } = useSlurmUsers(hosts);
  const [filter, setFilter] = useState<string>(FILTER_ALL);

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

  const partitionsPerCluster = useMemo(
    () => partitionsByCluster<Job>((results ?? []) as ClusterResult<Job[]>[], (j) => j.partition),
    [results],
  );

  const filtered = useMemo(
    () => applyClusterFilter<Job>((results ?? []) as ClusterResult<Job[]>[], filter, (j) => j.partition),
    [results, filter],
  );

  if (!hostsLoading && hosts.length === 0) {
    return <NoHostView />;
  }

  const isLoading = hostsLoading || usersLoading || jobsLoading;
  const allFailures = (results ?? []).filter((r) => !r.ok);
  const filteredSuccesses = filtered.filter((r) => r.ok);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search jobs across clusters…"
      navigationTitle={hosts.length ? `My Jobs — ${hosts.join(", ")}` : "My Jobs"}
      searchBarAccessory={
        <ClusterFilterDropdown tooltip="Filter" value={filter} onChange={setFilter} clusters={partitionsPerCluster} />
      }
    >
      {allFailures.map((r) =>
        !r.ok ? <ClusterAuthRow key={`err:${r.host}`} host={r.host} info={r.error} onReauth={revalidate} /> : null,
      )}

      {filteredSuccesses.length === 0 && allFailures.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No jobs"
          description="No queued or running jobs on any active cluster."
          icon={Icon.Tray}
        />
      ) : null}

      {filteredSuccesses.map((r) =>
        r.ok ? (
          <List.Section key={r.host} title={r.host} subtitle={`${r.data.length} jobs`}>
            {r.data.map((job) => (
              <JobItem key={`${r.host}:${job.jobId}`} job={job} host={r.host} onCancelled={revalidate} />
            ))}
          </List.Section>
        ) : null,
      )}
    </List>
  );
}

function JobItem({ job, host, onCancelled }: { job: Job; host: string; onCancelled: () => void }) {
  const { push } = useNavigation();

  const accessories: List.Item.Accessory[] = [
    { tag: { value: job.partition, color: Color.SecondaryText } },
    { text: `${job.elapsed} / ${job.timeLimit}` },
  ];
  accessories.push({ text: `${job.cpus} CPU` });
  const mem = memFromTres(job.tres);
  if (mem) accessories.push({ text: mem });
  const gpu = gpuLabelFromTres(job.tres);
  if (gpu) accessories.push({ text: gpu });

  return (
    <List.Item
      title={job.jobId}
      subtitle={job.name.length > 30 ? `${job.name.slice(0, 29)}…` : job.name}
      keywords={[host, job.partition, job.state, job.name, job.reasonOrNodeList]}
      icon={{ source: Icon.Hammer, tintColor: stateColor(job.state) }}
      accessories={accessories}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Cluster" text={host} />
              <List.Item.Detail.Metadata.Label title="Job ID" text={job.jobId} />
              <List.Item.Detail.Metadata.Label title="Name" text={job.name} />
              <List.Item.Detail.Metadata.TagList title="State">
                <List.Item.Detail.Metadata.TagList.Item text={job.state} color={stateColor(job.state)} />
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.Label title="Partition" text={job.partition} />
              <List.Item.Detail.Metadata.Label title="Nodes" text={job.nodes} />
              <List.Item.Detail.Metadata.Label title="CPUs" text={job.cpus} />
              <List.Item.Detail.Metadata.Label title="Elapsed" text={`${job.elapsed} / ${job.timeLimit}`} />
              {job.tres ? <List.Item.Detail.Metadata.Label title="TRES" text={job.tres} /> : null}
              {shortReason(job.reasonOrNodeList) ? (
                <List.Item.Detail.Metadata.Label
                  title={job.state === "RUNNING" ? "Node List" : "Reason"}
                  text={job.reasonOrNodeList}
                />
              ) : null}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action
            title="View Details"
            icon={Icon.Eye}
            onAction={() => push(<JobDetailView host={host} jobId={job.jobId} />)}
          />
          <Action
            title="Tail StdOut"
            icon={Icon.Terminal}
            shortcut={{ modifiers: ["cmd"], key: "t" }}
            onAction={async () => {
              const detail = await safeShowJob(host, job.jobId);
              const out = detail?.fields.StdOut;
              if (!out) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "No StdOut path",
                  message: "scontrol did not return StdOut for this job.",
                });
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

function JobDetailView({ host, jobId }: { host: string; jobId: string }) {
  const { data, isLoading, error } = useCachedPromise((h: string, id: string) => showJob(h, id), [host, jobId]);

  const md = useMemo(() => {
    if (error) {
      const info = classifySshError(error, host);
      const hint = info.hint ? `> ${info.hint}\n\n` : "";
      return `# ${info.title}\n\n${info.message}\n\n${hint}\`\`\`\n${info.raw}\n\`\`\``;
    }
    if (!data) return "Loading…";
    const f = data.fields;
    const sections: string[] = [];
    sections.push(`# Job ${f.JobId ?? jobId}`);
    sections.push(`**${f.JobName ?? ""}** — \`${f.JobState ?? ""}\` · cluster \`${host}\``);
    sections.push("");
    sections.push("## Resources");
    sections.push(`- Partition: \`${f.Partition ?? ""}\``);
    sections.push(`- NumNodes: ${f.NumNodes ?? ""}, NumCPUs: ${f.NumCPUs ?? ""}`);
    if (f.TRES) sections.push(`- TRES: \`${f.TRES}\``);
    if (f.NodeList) sections.push(`- NodeList: \`${f.NodeList}\``);
    sections.push("");
    sections.push("## Time");
    sections.push("");
    sections.push("|        |                                       |");
    sections.push("| ------ | ------------------------------------- |");
    sections.push(`| Submit | ${formatSlurmDateTime(f.SubmitTime ?? "")} |`);
    sections.push(`| Start  | ${formatSlurmDateTime(f.StartTime ?? "")} |`);
    sections.push(`| End    | ${formatSlurmDateTime(f.EndTime ?? "")} |`);
    sections.push(`| Limit  | ${formatSlurmDuration(f.TimeLimit ?? "")} |`);
    sections.push("");
    sections.push("## Paths");
    if (f.WorkDir) sections.push(`- WorkDir: \`${f.WorkDir}\``);
    if (f.StdOut) sections.push(`- StdOut:  \`${f.StdOut}\``);
    if (f.StdErr) sections.push(`- StdErr:  \`${f.StdErr}\``);
    if (f.Command) {
      sections.push("");
      sections.push("## Command");
      sections.push("```sh");
      sections.push(f.Command);
      sections.push("```");
    }
    sections.push("");
    sections.push("## Raw");
    sections.push("```");
    sections.push(data.raw.trim());
    sections.push("```");
    return sections.join("\n");
  }, [data, error, jobId, host]);

  return (
    <Detail
      isLoading={isLoading}
      markdown={md}
      navigationTitle={`Job ${jobId} — ${host}`}
      actions={
        <ActionPanel>
          {data?.fields.StdOut ? (
            <Action.CopyToClipboard title="Copy StdOut Path" content={data.fields.StdOut} />
          ) : null}
          {data?.fields.WorkDir ? <Action.CopyToClipboard title="Copy WorkDir" content={data.fields.WorkDir} /> : null}
          {data ? <Action.CopyToClipboard title="Copy Raw Scontrol Output" content={data.raw} /> : null}
        </ActionPanel>
      }
    />
  );
}

function TailView({ host, path, title }: { host: string; path: string; title: string }) {
  const [lines, setLines] = useState<string[]>([]);
  const [stopped, setStopped] = useState(false);

  useEffect(() => {
    const proc = tailFile(host, path);
    let buffer = "";
    proc.stdout?.on("data", (chunk: Buffer) => {
      buffer += chunk.toString();
      const parts = buffer.split("\n");
      buffer = parts.pop() ?? "";
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

function countByState(jobs: Job[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const j of jobs) out[j.state] = (out[j.state] ?? 0) + 1;
  return out;
}

function formatCounts(counts: Record<string, number>): string {
  const order = ["RUNNING", "PENDING", "COMPLETING"];
  const parts: string[] = [];
  for (const k of order) {
    if (counts[k]) parts.push(`${k[0]}${counts[k]}`);
  }
  for (const [k, v] of Object.entries(counts)) {
    if (!order.includes(k)) parts.push(`${k[0]}${v}`);
  }
  return parts.join("·") || "idle";
}
