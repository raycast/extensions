import { List, Icon, ActionPanel, Action, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getBuildHistory } from "./storage";
import { BuildHistoryEntry, JenkinsJob } from "./types";
import { relativeTime } from "./utils/time";
import { getStatusIcon } from "./utils/status";
import { BuildParamForm } from "./components/BuildParamForm";

export function buildUrl(jobUrl: string, buildNumber: number): string | null {
  if (buildNumber === 0) return null;
  return `${jobUrl.replace(/\/$/, "")}/${buildNumber}/`;
}

export function reconstructJob(entry: BuildHistoryEntry): JenkinsJob {
  return {
    name: entry.jobName,
    url: entry.jobUrl,
    path: entry.jobPath,
    status: entry.status,
  };
}

interface BuildHistoryProps {
  jobPath?: string;
}

export default function BuildHistory({ jobPath }: BuildHistoryProps = {}) {
  const { data, isLoading } = useCachedPromise(getBuildHistory);
  const { push } = useNavigation();

  const entries = jobPath
    ? (data ?? []).filter((e) => e.jobPath === jobPath)
    : (data ?? []);

  return (
    <List isLoading={isLoading} navigationTitle="Build History">
      {!isLoading && entries.length === 0 && (
        <List.EmptyView
          title="No Build History"
          description="Trigger a build to see it here."
        />
      )}
      {entries.map((entry) => (
        <List.Item
          key={`${entry.jobPath}-${entry.triggeredAt}`}
          title={entry.jobName}
          subtitle={
            entry.buildNumber === 0 ? "#queued" : `#${entry.buildNumber}`
          }
          icon={getStatusIcon(entry.status)}
          accessories={[
            {
              text: relativeTime(entry.triggeredAt),
              tooltip: new Date(entry.triggeredAt).toLocaleString(),
            },
          ]}
          actions={
            <ActionPanel>
              {entry.buildNumber !== 0 && (
                <Action.OpenInBrowser
                  title="Open in Browser"
                  url={buildUrl(entry.jobUrl, entry.buildNumber)!}
                />
              )}
              <Action
                title="Re-trigger Build"
                icon={Icon.Play}
                onAction={() =>
                  push(<BuildParamForm job={reconstructJob(entry)} />)
                }
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
