import { Action, ActionPanel, Color, Icon, Keyboard, List, Toast, confirmAlert, showToast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useEffect } from "react";
import { Paginated, RUNNING_STATUSES, UnifiedJob, apiBase, authHeaders, cancelJob, jobWebUrl } from "../common/awx";
import { formatElapsed, statusColor, statusIcon } from "../common/format";

const REFRESH_INTERVAL_MS = 5000;

export default function RunningJobs() {
  const { isLoading, data, revalidate } = useFetch(
    () => {
      const params = new URLSearchParams({
        status__in: RUNNING_STATUSES.join(","),
        order_by: "-started",
        page_size: "100",
      });
      return `${apiBase()}/unified_jobs/?${params.toString()}`;
    },
    {
      headers: authHeaders(),
      keepPreviousData: true,
      mapResult(result: Paginated<UnifiedJob>) {
        return { data: result.results };
      },
      onError(error) {
        showToast({ style: Toast.Style.Failure, title: "Failed to load jobs", message: error.message });
      },
    },
  );

  // Poll while the command is open so status/elapsed stay live.
  useEffect(() => {
    const timer = setInterval(revalidate, REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [revalidate]);

  async function onCancel(job: UnifiedJob) {
    const ok = await confirmAlert({
      title: `Cancel "${job.name}"?`,
      message: `Job #${job.id} will be stopped.`,
      icon: { source: Icon.XMarkCircle, tintColor: Color.Red },
      primaryAction: { title: "Cancel Job" },
    });
    if (!ok) return;

    const toast = await showToast({ style: Toast.Style.Animated, title: `Cancelling job #${job.id}…` });
    try {
      await cancelJob(job);
      toast.style = Toast.Style.Success;
      toast.title = `Cancel requested for job #${job.id}`;
      revalidate();
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Cancel failed";
      toast.message = e instanceof Error ? e.message : String(e);
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter running jobs…">
      <List.EmptyView icon={Icon.CheckCircle} title="No jobs are running" description="All quiet on the AWX front." />
      {data?.map((job) => (
        <List.Item
          key={`${job.type}-${job.id}`}
          icon={{ source: statusIcon(job.status), tintColor: statusColor(job.status) }}
          title={job.name}
          subtitle={`#${job.id}`}
          accessories={[
            { text: formatElapsed(job.elapsed), icon: Icon.Clock, tooltip: "Elapsed" },
            { tag: { value: job.status, color: statusColor(job.status) } },
          ]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open in AWX" url={jobWebUrl(job)} icon={Icon.Globe} />
              <Action
                title="Cancel Job"
                icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
                style={Action.Style.Destructive}
                shortcut={{
                  macOS: { modifiers: ["ctrl"], key: "x" },
                  Windows: { modifiers: ["ctrl"], key: "x" },
                }}
                onAction={() => onCancel(job)}
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
