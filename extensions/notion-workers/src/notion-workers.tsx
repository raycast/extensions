import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { listRuns, listWorkers, NtnError, type Worker } from "./lib/ntn";
import { formatDateTime, formatRelative } from "./lib/format";
import { useWorkerLocation } from "./lib/workerLocation";
import RunsView from "./views/Runs";
import CapabilitiesView from "./views/Capabilities";
import EnvVarsView from "./views/EnvVars";
import SyncStatusView from "./views/SyncStatus";
import DeployView from "./views/Deploy";
import { SetWorkerLocationForm } from "./views/SetWorkerLocation";

type LastRunMap = Record<string, string | null>;

type WorkersData = {
  workers: Worker[];
  lastRun: LastRunMap;
};

async function fetchWorkersWithRuns(): Promise<WorkersData> {
  const workers = await listWorkers();
  const entries = await Promise.all(
    workers.map(async (worker): Promise<[string, string | null]> => {
      try {
        const runs = await listRuns(worker.workerId);
        let mostRecent: string | null = null;
        for (const run of runs) {
          if (!mostRecent || new Date(run.startedAt) > new Date(mostRecent)) {
            mostRecent = run.startedAt;
          }
        }
        return [worker.workerId, mostRecent];
      } catch {
        return [worker.workerId, null];
      }
    }),
  );
  return { workers, lastRun: Object.fromEntries(entries) };
}

export default function Command() {
  const [showingDetail, setShowingDetail] = useState(false);

  const { data, isLoading, revalidate } = useCachedPromise(
    fetchWorkersWithRuns,
    [],
    {
      initialData: { workers: [], lastRun: {} } as WorkersData,
      onError: async (err) => {
        const message = err instanceof NtnError ? err.message : String(err);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to list workers",
          message,
        });
      },
    },
  );

  const workers = data.workers;
  const lastRun = data.lastRun;

  const sortedWorkers = useMemo(() => {
    const copy = [...workers];
    copy.sort((a, b) => {
      const ra = lastRun[a.workerId];
      const rb = lastRun[b.workerId];
      if (ra && rb) return new Date(rb).getTime() - new Date(ra).getTime();
      if (ra) return -1;
      if (rb) return 1;
      return a.name.localeCompare(b.name);
    });
    return copy;
  }, [workers, lastRun]);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showingDetail}
      searchBarPlaceholder="Search workers"
    >
      {sortedWorkers.map((worker) => (
        <WorkerItem
          key={worker.workerId}
          worker={worker}
          lastRunAt={lastRun[worker.workerId]}
          showingDetail={showingDetail}
          onToggleDetail={() => setShowingDetail((v) => !v)}
          onRefresh={revalidate}
        />
      ))}
      {!isLoading && workers.length === 0 ? (
        <List.EmptyView
          icon={Icon.Hammer}
          title="No workers found"
          description="Deploy a worker with `ntn workers deploy`, then refresh."
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      ) : null}
    </List>
  );
}

function WorkerItem({
  worker,
  lastRunAt,
  showingDetail,
  onToggleDetail,
  onRefresh,
}: {
  worker: Worker;
  lastRunAt: string | null | undefined;
  showingDetail: boolean;
  onToggleDetail: () => void;
  onRefresh: () => void;
}) {
  const [location] = useWorkerLocation(worker.workerId);
  const { push } = useNavigation();

  function handleDeploy() {
    if (location) {
      push(<DeployView worker={worker} location={location} />);
      return;
    }
    push(
      <SetWorkerLocationForm
        worker={worker}
        onSaved={(path) => {
          push(<DeployView worker={worker} location={path} />);
        }}
      />,
    );
  }

  const accessories = useMemo<List.Item.Accessory[]>(() => {
    if (showingDetail) return [];
    const base: List.Item.Accessory[] = [
      { text: worker.workerId, tooltip: "Worker ID" },
    ];
    if (lastRunAt === undefined) {
      base.push({
        tag: { value: "Loading…", color: Color.SecondaryText },
        tooltip: "Fetching most recent run",
      });
    } else if (lastRunAt === null) {
      base.push({
        tag: { value: "No runs", color: Color.SecondaryText },
        tooltip: "This worker has no recorded runs",
      });
    } else {
      base.push({
        date: new Date(lastRunAt),
        tooltip: `Last run ${formatDateTime(lastRunAt)}`,
      });
    }
    return base;
  }, [worker, lastRunAt, showingDetail]);

  return (
    <List.Item
      icon={Icon.Hammer}
      title={worker.name}
      accessories={accessories}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label
                title="Name"
                text={worker.name}
              />
              <List.Item.Detail.Metadata.Label
                title="Worker ID"
                text={worker.workerId}
              />
              <List.Item.Detail.Metadata.Label
                title="Space ID"
                text={worker.spaceId}
              />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Created"
                text={`${formatDateTime(worker.createdAt)} (${formatRelative(worker.createdAt)})`}
              />
              <List.Item.Detail.Metadata.Label
                title="Updated"
                text={`${formatDateTime(worker.updatedAt)} (${formatRelative(worker.updatedAt)})`}
              />
              <List.Item.Detail.Metadata.Label
                title="Last Run"
                text={
                  lastRunAt === undefined
                    ? "Loading…"
                    : lastRunAt === null
                      ? "No runs"
                      : `${formatDateTime(lastRunAt)} (${formatRelative(lastRunAt)})`
                }
              />
              <List.Item.Detail.Metadata.Label
                title="Local Location"
                text={location ?? "Not set"}
              />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.Push
            title="View Runs"
            icon={Icon.List}
            target={<RunsView worker={worker} />}
          />
          <Action
            title={
              showingDetail ? "Hide Worker Details" : "Show Worker Details"
            }
            icon={Icon.Sidebar}
            onAction={onToggleDetail}
          />
          <Action.Push
            title="View Capabilities"
            icon={Icon.Stars}
            target={<CapabilitiesView worker={worker} />}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <Action.Push
            title="View Environment Variables"
            icon={Icon.Key}
            target={<EnvVarsView worker={worker} />}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
          />
          <Action.Push
            title="View Sync Status"
            icon={Icon.ArrowClockwise}
            target={<SyncStatusView worker={worker} />}
          />
          <ActionPanel.Section>
            <Action
              title="Deploy Worker"
              icon={Icon.Rocket}
              onAction={handleDeploy}
              shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
            />
            {location ? (
              <Action.ShowInFinder
                title="View in Finder"
                path={location}
                shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
              />
            ) : null}
            <Action.Push
              title="Set Worker Location"
              icon={Icon.Folder}
              target={<SetWorkerLocationForm worker={worker} />}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Worker ID"
              content={worker.workerId}
            />
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={onRefresh}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
