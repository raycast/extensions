import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  LaunchType,
  launchCommand,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { BaselineReference, compatibilityKey, HistorySnapshot, StoredBenchmarkRun } from "./history/history";
import { capitalize, formatBinaryBytes, formatBytes, formatSpeed } from "./presentation/format";
import { benchmarkHistory } from "./raycast/services";

export default function ViewStorageHistoryCommand() {
  const [snapshot, setSnapshot] = useState<HistorySnapshot>();

  const reload = useCallback(async () => {
    setSnapshot(await benchmarkHistory.snapshot());
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const volumes = Object.values(snapshot?.volumes ?? {}).sort((left, right) =>
    left.volume.name.localeCompare(right.volume.name),
  );

  return (
    <List isLoading={!snapshot} searchBarPlaceholder="Search disks and results…">
      {volumes.length === 0 && snapshot ? (
        <List.EmptyView
          icon={Icon.HardDrive}
          title="No Storage Benchmark Results"
          description="Run Storage Benchmark to establish a local performance baseline."
          actions={
            <ActionPanel>
              <Action
                title="Run Storage Benchmark"
                icon={Icon.Play}
                onAction={() => launchCommand({ name: "run-storage-benchmark", type: LaunchType.UserInitiated })}
              />
            </ActionPanel>
          }
        />
      ) : null}

      {volumes.map((volume) => {
        const detachedBaselines = Object.entries(volume.baselines).filter(
          ([, baseline]) => !volume.successfulRuns.some((run) => run.id === baseline.runId),
        );
        return (
          <List.Section
            key={volume.volume.id}
            title={volume.volume.name}
            subtitle={`${volume.successfulRuns.length} runs`}
          >
            {volume.successfulRuns.map((run) => {
              const key = compatibilityKey(run);
              const baseline = volume.baselines[key];
              const isBaseline = baseline?.runId === run.id;
              return (
                <List.Item
                  key={run.id}
                  icon={{
                    source: isBaseline ? Icon.Star : Icon.Gauge,
                    tintColor: isBaseline ? Color.Yellow : Color.Blue,
                  }}
                  title={formatDate(run.completedAt)}
                  subtitle={`${capitalize(run.result.confidence)} confidence · ${formatBytes(run.result.measuredBytes)} measured · ${formatBinaryBytes(run.configuration.maxBytes)} / ${run.configuration.targetDurationSeconds}s target · ${run.result.methodologyVersion}`}
                  keywords={[
                    volume.volume.name,
                    formatSpeed(run.result.write.megabytesPerSecond),
                    formatSpeed(run.result.read.megabytesPerSecond),
                    capitalize(run.result.confidence),
                    run.result.methodologyVersion,
                    formatBinaryBytes(run.configuration.maxBytes),
                    `${run.configuration.targetDurationSeconds} seconds`,
                    ...(isBaseline ? [capitalize(baseline.status), "baseline"] : []),
                  ]}
                  accessories={[
                    {
                      text: formatSpeed(run.result.write.megabytesPerSecond),
                      icon: Icon.Upload,
                      tooltip: "Sequential Write",
                    },
                    {
                      text: formatSpeed(run.result.read.megabytesPerSecond),
                      icon: Icon.Download,
                      tooltip: "Sequential Read",
                    },
                    ...(isBaseline
                      ? [
                          {
                            tag: {
                              value: baseline.status === "confirmed" ? "Baseline" : "Provisional",
                              color: Color.Yellow,
                            },
                          },
                        ]
                      : []),
                  ]}
                  actions={historyActions(run, baseline, reload)}
                />
              );
            })}
            {detachedBaselines.map(([key, baseline]) => (
              <List.Item
                key={`baseline-${key}`}
                icon={{ source: Icon.Star, tintColor: Color.Yellow }}
                title="Stored Baseline"
                subtitle={`${capitalize(baseline.result.confidence)} confidence · ${formatBytes(baseline.result.measuredBytes)} · ${baseline.result.methodologyVersion}`}
                keywords={[
                  volume.volume.name,
                  capitalize(baseline.status),
                  "baseline",
                  baseline.result.methodologyVersion,
                ]}
                accessories={[
                  {
                    text: formatSpeed(baseline.result.write.megabytesPerSecond),
                    icon: Icon.Upload,
                    tooltip: "Sequential Write",
                  },
                  {
                    text: formatSpeed(baseline.result.read.megabytesPerSecond),
                    icon: Icon.Download,
                    tooltip: "Sequential Read",
                  },
                  { tag: { value: capitalize(baseline.status), color: Color.Yellow } },
                ]}
                actions={detachedBaselineActions(volume.volume.id, volume.volume.name, key, reload)}
              />
            ))}
          </List.Section>
        );
      })}

      {snapshot && snapshot.diagnostics.length > 0 ? (
        <List.Section title="Recent Issues" subtitle="Not included in performance history">
          {snapshot.diagnostics.map((diagnostic) => (
            <List.Item
              key={diagnostic.id}
              icon={{
                source: diagnostic.status === "cancelled" ? Icon.Stop : Icon.Warning,
                tintColor: diagnostic.status === "cancelled" ? Color.Orange : Color.Red,
              }}
              title={diagnostic.status === "cancelled" ? "Cancelled" : "Failed"}
              subtitle={diagnostic.message}
              accessories={[{ date: new Date(diagnostic.completedAt) }]}
            />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}

function historyActions(run: StoredBenchmarkRun, baseline: BaselineReference | undefined, reload: () => Promise<void>) {
  const key = compatibilityKey(run);
  const isBaseline = baseline?.runId === run.id;
  return (
    <ActionPanel>
      <Action
        title="Run Storage Benchmark"
        icon={Icon.Play}
        onAction={() => launchCommand({ name: "run-storage-benchmark", type: LaunchType.UserInitiated })}
      />
      {!isBaseline ? (
        <Action
          title="Set as Baseline"
          icon={Icon.Star}
          onAction={async () => {
            await benchmarkHistory.setBaseline(run.volume.id, key, run.id);
            await reload();
            await showToast({ style: Toast.Style.Success, title: "Baseline Updated", message: run.volume.name });
          }}
        />
      ) : null}
      {baseline ? (
        <Action
          title="Reset Baseline"
          icon={Icon.XMarkCircle}
          onAction={async () => {
            await benchmarkHistory.resetBaseline(run.volume.id, key);
            await reload();
          }}
        />
      ) : null}
      <Action
        title="Delete Result"
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        onAction={async () => {
          const confirmed = await confirmAlert({
            title: "Delete this result?",
            message: "This cannot be undone.",
            primaryAction: { title: "Delete Result", style: Alert.ActionStyle.Destructive },
          });
          if (!confirmed) return;
          await benchmarkHistory.deleteRun(run.volume.id, run.id);
          await reload();
        }}
      />
      <Action
        title={`Delete All History for ${run.volume.name}`}
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        onAction={async () => {
          const confirmed = await confirmDeleteVolume(run.volume.name);
          if (!confirmed) return;
          await deleteVolume(run.volume.id, reload);
        }}
      />
    </ActionPanel>
  );
}

function detachedBaselineActions(volumeId: string, volumeName: string, key: string, reload: () => Promise<void>) {
  return (
    <ActionPanel>
      <Action
        title="Run Storage Benchmark"
        icon={Icon.Play}
        onAction={() => launchCommand({ name: "run-storage-benchmark", type: LaunchType.UserInitiated })}
      />
      <Action
        title="Reset Baseline"
        icon={Icon.XMarkCircle}
        onAction={async () => {
          await benchmarkHistory.resetBaseline(volumeId, key);
          await reload();
        }}
      />
      <Action
        title={`Delete All History for ${volumeName}`}
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        onAction={async () => {
          const confirmed = await confirmDeleteVolume(volumeName);
          if (!confirmed) return;
          await deleteVolume(volumeId, reload);
        }}
      />
    </ActionPanel>
  );
}

async function confirmDeleteVolume(volumeName: string): Promise<boolean> {
  return confirmAlert({
    title: `Delete all history for ${volumeName}?`,
    message: "All results and baselines for this volume will be removed.",
    primaryAction: { title: "Delete All History", style: Alert.ActionStyle.Destructive },
  });
}

async function deleteVolume(volumeId: string, reload: () => Promise<void>): Promise<void> {
  await benchmarkHistory.deleteVolume(volumeId);
  await reload();
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
