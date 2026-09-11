import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo } from "react";
import { getBuildkiteClient } from "../api/withBuildkiteClient";
import { BuildFragment, BuildJobFragment } from "../generated/graphql";
import { getJobStateIcon } from "../utils/states";
import { truthy } from "../utils/truthy";

type JobNode = BuildJobFragment;
type JobTypename = JobNode["__typename"];

const JOB_TYPE_LABEL: Record<JobTypename, string> = {
  JobTypeCommand: "Command",
  JobTypeBlock: "Block",
  JobTypeWait: "Wait",
  JobTypeTrigger: "Trigger",
};

interface BuildDetailsProps {
  build: BuildFragment;
}

function jobLabel(job: JobNode): string {
  return job.label?.trim() || job.step?.key || JOB_TYPE_LABEL[job.__typename].toLowerCase();
}

function jobDeps(job: JobNode): string[] {
  const edges = job.step?.dependencies?.edges ?? [];
  return edges.map((e) => e?.node?.key).filter(truthy);
}

interface Derived {
  jobs: JobNode[];
  byLevel: Map<number, JobNode[]>;
  blockedJobs: { id: string; label: string }[];
}

function deriveFromJobs(rawJobs: JobNode[]): Derived {
  const jobs = rawJobs;

  // DAG keyed by step.key; keyless jobs can't be referenced as deps, so they
  // anchor at depth 0. job.id is the unique identity used for rendering/highlight.
  const byKey = new Map<string, JobNode>();
  for (const job of jobs) {
    const key = job.step?.key;
    if (key) byKey.set(key, job);
  }

  const depths = new Map<string, number>();
  const visiting = new Set<string>();
  function depth(job: JobNode): number {
    const id = job.id;
    const cached = depths.get(id);
    if (cached !== undefined) return cached;
    if (visiting.has(id)) {
      depths.set(id, 0);
      return 0;
    }
    visiting.add(id);
    const deps = jobDeps(job)
      .map((k) => byKey.get(k))
      .filter(truthy);
    const d = deps.length === 0 ? 0 : 1 + Math.max(...deps.map(depth));
    visiting.delete(id);
    depths.set(id, d);
    return d;
  }
  for (const job of jobs) depth(job);

  const byLevel = new Map<number, JobNode[]>();
  for (const job of jobs) {
    const d = depths.get(job.id) ?? 0;
    const bucket = byLevel.get(d);
    if (bucket) bucket.push(job);
    else byLevel.set(d, [job]);
  }
  const blockedJobs = jobs
    .filter((j): j is Extract<JobNode, { __typename: "JobTypeBlock" }> => j.__typename === "JobTypeBlock")
    .filter((j) => j.state === "BLOCKED" && j.isUnblockable !== false)
    .map((j) => ({ id: j.id, label: jobLabel(j) }));

  return { jobs, byLevel, blockedJobs };
}

export function BuildDetails({ build }: BuildDetailsProps) {
  const buildkite = getBuildkiteClient();
  const { data, isLoading, revalidate } = useCachedPromise(
    async (uuid: string) => {
      const result = await buildkite.getBuild({ uuid });
      return result.build;
    },
    [build.uuid],
    { keepPreviousData: true },
  );

  const derived = useMemo<Derived>(() => {
    const rawJobs = (data?.jobs?.edges ?? []).map((e) => e?.node).filter(truthy);
    return deriveFromJobs(rawJobs);
  }, [data]);

  const totalJobs = data?.jobs?.count ?? derived.jobs.length;
  const truncated = data?.jobs?.pageInfo?.hasNextPage === true;

  const pipelineName = build.pipeline?.name;
  const title = pipelineName ? `${pipelineName} #${build.number}` : `Build #${build.number}`;
  const buildLabel = pipelineName ? `${pipelineName} #${build.number}` : `build #${build.number}`;

  async function unblock(jobId: string, label: string) {
    const confirmed = await confirmAlert({
      title: "Unblock step?",
      message: label,
      primaryAction: { title: "Unblock" },
    });
    if (!confirmed) return;
    const toast = await showToast({ style: Toast.Style.Animated, title: "Unblocking…", message: label });
    try {
      await buildkite.unblockJob({ id: jobId });
      toast.style = Toast.Style.Success;
      toast.title = "Unblocked";
      revalidate();
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to unblock step";
      toast.message = err instanceof Error ? err.message : String(err);
    }
  }

  async function unblockAll() {
    const targets = derived.blockedJobs;
    if (!targets.length) {
      await showToast({ style: Toast.Style.Success, title: "No blocked steps" });
      return;
    }
    const confirmed = await confirmAlert({
      title: `Unblock ${targets.length} step${targets.length === 1 ? "" : "s"} on ${buildLabel}?`,
      message: targets.map((t) => `• ${t.label}`).join("\n"),
      primaryAction: { title: "Unblock All", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Unblocking ${targets.length} step${targets.length === 1 ? "" : "s"}…`,
    });
    const results = await Promise.allSettled(targets.map((t) => buildkite.unblockJob({ id: t.id })));
    const failures = results
      .map((r, i) => (r.status === "rejected" ? { label: targets[i].label, error: String(r.reason) } : null))
      .filter(truthy);
    const succeeded = targets.length - failures.length;
    revalidate();
    if (failures.length === 0) {
      toast.style = Toast.Style.Success;
      toast.title = `Unblocked ${succeeded} step${succeeded === 1 ? "" : "s"}`;
      toast.message = undefined;
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = `Unblocked ${succeeded} / ${targets.length}, ${failures.length} failed`;
      toast.message = failures.map((f) => `${f.label}: ${f.error}`).join("\n");
    }
  }

  const hasBlocked = derived.blockedJobs.length > 0;

  return (
    <List isLoading={isLoading} navigationTitle={title} searchBarPlaceholder="Filter steps…" isShowingDetail>
      {truncated ? (
        <List.Section title="Notice">
          <List.Item
            title={`Showing first ${derived.jobs.length} of ${totalJobs} steps`}
            subtitle="Open this build in Buildkite to see the rest"
            icon={{ source: Icon.ExclamationMark, tintColor: Color.Orange }}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={build.url} title="Open Build in Browser" />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}
      {Array.from(derived.byLevel.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([level, levelJobs]) => (
          <List.Section
            key={level}
            title={`Stage ${level + 1}`}
            subtitle={`${levelJobs.length} step${levelJobs.length === 1 ? "" : "s"}`}
          >
            {levelJobs.map((job) => {
              const label = jobLabel(job);
              const deps = jobDeps(job);
              const typeLabel = JOB_TYPE_LABEL[job.__typename];
              const canUnblock =
                job.__typename === "JobTypeBlock" && job.state === "BLOCKED" && job.isUnblockable !== false;
              const url = job.__typename === "JobTypeCommand" ? job.url : undefined;
              return (
                <List.Item
                  key={job.id}
                  title={label}
                  icon={getJobStateIcon(job.state)}
                  accessories={[
                    { text: typeLabel.toLowerCase() },
                    ...(deps.length ? [{ text: `← ${deps.join(", ")}` }] : []),
                  ]}
                  detail={
                    <List.Item.Detail
                      metadata={
                        <List.Item.Detail.Metadata>
                          <List.Item.Detail.Metadata.Label title="Label" text={label} />
                          <List.Item.Detail.Metadata.Label title="Type" text={typeLabel} />
                          <List.Item.Detail.Metadata.Label title="State" text={job.state} />
                          {job.step?.key ? <List.Item.Detail.Metadata.Label title="Key" text={job.step.key} /> : null}
                          {deps.length ? (
                            <List.Item.Detail.Metadata.Label title="Depends on" text={deps.join(", ")} />
                          ) : null}
                          {url ? (
                            <List.Item.Detail.Metadata.Link title="Job" target={url} text="Open in Buildkite" />
                          ) : null}
                        </List.Item.Detail.Metadata>
                      }
                    />
                  }
                  actions={
                    <ActionPanel>
                      {canUnblock ? (
                        <Action title="Unblock Step" icon={Icon.LockUnlocked} onAction={() => unblock(job.id, label)} />
                      ) : null}
                      {url ? <Action.OpenInBrowser url={url} title="Open Job in Browser" /> : null}
                      <Action.OpenInBrowser url={build.url} title="Open Build in Browser" />
                      <Action
                        title="Refresh"
                        icon={Icon.ArrowClockwise}
                        onAction={revalidate}
                        shortcut={{ modifiers: ["cmd"], key: "r" }}
                      />
                      {hasBlocked ? (
                        <ActionPanel.Section title="Danger Zone">
                          <Action
                            title={`Unblock All Steps (${derived.blockedJobs.length})`}
                            icon={Icon.LockUnlocked}
                            style={Action.Style.Destructive}
                            shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
                            onAction={unblockAll}
                          />
                        </ActionPanel.Section>
                      ) : null}
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        ))}
    </List>
  );
}
