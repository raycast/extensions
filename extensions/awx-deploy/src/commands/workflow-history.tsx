import { Action, ActionPanel, Color, Icon, Keyboard, List, Toast, showToast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { WorkflowJob, apiBase, fetchAll, workflowTemplateWebUrl } from "../common/awx";
import { formatElapsed, statusColor, statusIcon } from "../common/format";
import { durationStats } from "../common/stats";
import { WorkflowStatsDetail } from "../components/workflow-stats-detail";

const WINDOW_DAYS = 7;

interface TemplateGroup {
  id: number;
  name: string;
  jobs: WorkflowJob[];
}

export default function WorkflowHistory() {
  const { data, isLoading, revalidate } = usePromise(
    async () => {
      const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
      const jobs = await fetchAll<WorkflowJob>(
        `${apiBase()}/workflow_jobs/?created__gte=${encodeURIComponent(since)}&order_by=-created&page_size=200`,
        2000,
      );
      return groupByTemplate(jobs);
    },
    [],
    {
      onError(error) {
        showToast({ style: Toast.Style.Failure, title: "Failed to load history", message: error.message });
      },
    },
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder={`Workflows run in the last ${WINDOW_DAYS} days…`}>
      <List.EmptyView icon={Icon.Clock} title={`No workflows run in the last ${WINDOW_DAYS} days`} />
      {data?.map((group) => {
        const stats = durationStats(group.jobs.map((j) => j.elapsed));
        const latest = group.jobs[0];
        const accessories: List.Item.Accessory[] = [{ tag: { value: `${group.jobs.length} runs`, color: Color.Blue } }];
        if (stats) accessories.push({ text: `avg ${formatElapsed(stats.mean)}`, icon: Icon.Clock });
        if (latest) {
          accessories.push({
            icon: { source: statusIcon(latest.status), tintColor: statusColor(latest.status) },
            tooltip: `Latest: ${latest.status}`,
          });
        }

        return (
          <List.Item
            key={group.id}
            icon={{ source: Icon.Layers, tintColor: Color.Purple }}
            title={group.name}
            accessories={accessories}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Stats"
                  icon={Icon.BarChart}
                  target={<WorkflowStatsDetail template={{ id: group.id, name: group.name }} jobs={group.jobs} />}
                />
                <Action.OpenInBrowser title="Open in AWX" url={workflowTemplateWebUrl(group.id)} icon={Icon.Globe} />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={revalidate}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function groupByTemplate(jobs: WorkflowJob[]): TemplateGroup[] {
  const groups = new Map<number, TemplateGroup>();
  for (const job of jobs) {
    const t = job.summary_fields?.workflow_job_template;
    if (!t) continue;
    const group = groups.get(t.id) ?? { id: t.id, name: t.name, jobs: [] };
    group.jobs.push(job);
    groups.set(t.id, group);
  }
  return [...groups.values()].sort((a, b) => b.jobs.length - a.jobs.length);
}
