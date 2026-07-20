import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getConfig } from "./api";
import {
  CronJob,
  deleteCronJob,
  listCronJobs,
  pauseCronJob,
  resumeCronJob,
  triggerCronJob,
} from "./hermes-client";

function stateIcon(state: string): { source: Icon; color: Color } {
  switch (state) {
    case "scheduled":
      return { source: Icon.Clock, color: Color.Blue };
    case "running":
      return { source: Icon.ArrowClockwise, color: Color.Yellow };
    case "paused":
      return { source: Icon.Pause, color: Color.SecondaryText };
    case "completed":
      return { source: Icon.Checkmark, color: Color.Green };
    case "failed":
      return { source: Icon.Xmark, color: Color.Red };
    default:
      return { source: Icon.Circle, color: Color.SecondaryText };
  }
}

function relativeTime(iso: string | null): string {
  if (!iso) return "never";
  const date = new Date(iso);
  const delta = date.getTime() - Date.now();
  const abs = Math.abs(delta);
  const mins = Math.round(abs / 60_000);
  const hours = Math.round(abs / 3_600_000);
  const days = Math.round(abs / 86_400_000);
  const suffix = delta > 0 ? "from now" : "ago";
  if (mins < 60) return `${mins}m ${suffix}`;
  if (hours < 24) return `${hours}h ${suffix}`;
  return `${days}d ${suffix}`;
}

export default function Command() {
  const config = useMemo(() => getConfig(), []);
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPaused, setShowPaused] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      setJobs(await listCronJobs(config, { includeDisabled: true }));
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load cron jobs",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, [config]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handlePause(job: CronJob) {
    try {
      await pauseCronJob(config, job.id);
      showToast({ style: Toast.Style.Success, title: "Job paused" });
      refresh();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Pause failed",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function handleResume(job: CronJob) {
    try {
      await resumeCronJob(config, job.id);
      showToast({ style: Toast.Style.Success, title: "Job resumed" });
      refresh();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Resume failed",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function handleTrigger(job: CronJob) {
    try {
      await triggerCronJob(config, job.id);
      showToast({
        style: Toast.Style.Success,
        title: "Job triggered",
        message: "Will run on next tick",
      });
      refresh();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Trigger failed",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function handleDelete(job: CronJob) {
    const confirmed = await confirmAlert({
      title: "Delete Cron Job?",
      message: `"${job.name}" will be permanently removed.`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    try {
      await deleteCronJob(config, job.id);
      setJobs((prev) => prev.filter((j) => j.id !== job.id));
      showToast({ style: Toast.Style.Success, title: "Job deleted" });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Delete failed",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const filtered = showPaused ? jobs : jobs.filter((j) => j.enabled);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search cron jobs by name or prompt…"
      filtering
    >
      <List.Section
        title={`${filtered.length} job${filtered.length === 1 ? "" : "s"}`}
      >
        {filtered.map((job) => {
          const icon = stateIcon(job.state);
          const subtitle = job.schedule.display;
          return (
            <List.Item
              key={job.id}
              icon={{ source: icon.source, tintColor: icon.color }}
              title={job.name}
              subtitle={subtitle}
              accessories={[
                job.skills.length > 0
                  ? {
                      tag: {
                        value: `${job.skills.length} skill${job.skills.length === 1 ? "" : "s"}`,
                        color: Color.Purple,
                      },
                    }
                  : {},
                { text: `next: ${relativeTime(job.next_run_at)}` },
                job.last_status
                  ? {
                      tag: {
                        value: job.last_status,
                        color:
                          job.last_status === "completed"
                            ? Color.Green
                            : Color.Red,
                      },
                    }
                  : {},
              ]}
              detail={
                <List.Item.Detail
                  markdown={`## ${job.name}

**Schedule:** ${job.schedule.display}

**Prompt:**
${job.prompt.slice(0, 500)}

**State:** ${job.state}
**Enabled:** ${job.enabled ? "yes" : "no"}
**Next run:** ${job.next_run_at ? new Date(job.next_run_at).toLocaleString() : "none"}
**Last run:** ${job.last_run_at ? new Date(job.last_run_at).toLocaleString() : "never"}
**Last status:** ${job.last_status ?? "none"}
${job.last_error ? `\n**Last error:** ${job.last_error}` : ""}
${job.skills.length > 0 ? `\n**Skills:** ${job.skills.join(", ")}` : ""}
**Deliver:** ${job.deliver}
**Repeat:** ${job.repeat.times ?? "forever"} (${job.repeat.completed} done)`}
                />
              }
              actions={
                <ActionPanel>
                  <Action
                    title="Trigger Now"
                    icon={Icon.ArrowClockwise}
                    onAction={() => handleTrigger(job)}
                  />
                  {job.enabled ? (
                    <Action
                      title="Pause"
                      icon={Icon.Pause}
                      shortcut={{ modifiers: ["cmd"], key: "p" }}
                      onAction={() => handlePause(job)}
                    />
                  ) : (
                    <Action
                      title="Resume"
                      icon={Icon.Play}
                      shortcut={{ modifiers: ["cmd"], key: "p" }}
                      onAction={() => handleResume(job)}
                    />
                  )}
                  <Action.CopyToClipboard
                    title="Copy Job ID"
                    content={job.id}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Prompt"
                    content={job.prompt}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                  <Action
                    title="Delete"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={() => handleDelete(job)}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
      <List.Section title="Filter">
        <List.Item
          icon={Icon.Eye}
          title={showPaused ? "Hide Paused Jobs" : "Show Paused Jobs"}
          actions={
            <ActionPanel>
              <Action
                title={showPaused ? "Hide Paused" : "Show Paused"}
                icon={Icon.Eye}
                onAction={() => setShowPaused(!showPaused)}
              />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.EmptyView
        icon={Icon.Clock}
        title={isLoading ? "Loading cron jobs…" : "No cron jobs found"}
        description={
          isLoading
            ? ""
            : "Use Create Cron Job to schedule a new one. Requires cron module available on the server."
        }
      />
    </List>
  );
}
