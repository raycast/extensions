import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Detail,
  Grid,
  Icon,
  Toast,
  confirmAlert,
  environment,
  getPreferenceValues,
  open,
  showToast,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  MAX_RENDERABLE_PIECES,
  aggregateBitfield,
  hashBitfield,
} from "./lib/bitfield";
import { heatmapMarkdown, writeHeatmapFile } from "./lib/heatmap";
import {
  formatBytes,
  formatEta,
  formatPercent,
  formatSpeed,
} from "./lib/format";
import {
  getFileCount,
  getPrimaryUri,
  getTaskError,
  getTaskKind,
  getTaskKindLabel,
  getTaskName,
  getTaskProgress,
  getTaskStatusLabel,
  isActiveTask,
  isMetadataTask,
  isStoppedTask,
  isWaitingTask,
} from "./lib/task-type";
import { Aria2Task, ExtensionPreferences } from "./lib/types";
import {
  pauseTask,
  removeTask,
  removeTaskResult,
  resumeTask,
  tellStatus,
} from "./lib/rpc";

interface TaskDetailProps {
  gid: string;
}

const STATUS_KEYS = [
  "gid",
  "status",
  "totalLength",
  "completedLength",
  "downloadSpeed",
  "uploadSpeed",
  "connections",
  "numPieces",
  "pieceLength",
  "bitfield",
  "errorCode",
  "errorMessage",
  "dir",
  "files",
  "bittorrent",
  "following",
  "followedBy",
];

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function useTaskStatus(
  gid: string,
  refreshSeconds: number,
): {
  task: Aria2Task | null;
  error: string | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
} {
  const [task, setTask] = useState<Aria2Task | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const lastTaskJson = useRef("");

  const refresh = useCallback(async () => {
    try {
      const next = await tellStatus(gid, STATUS_KEYS);
      const serialized = JSON.stringify(next);
      if (serialized !== lastTaskJson.current) {
        lastTaskJson.current = serialized;
        setTask(next);
      }
      setError(null);
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setIsLoading(false);
    }
  }, [gid]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (cancelled) return;
      await refresh();
    }
    load();
    const interval = setInterval(
      () => {
        void refresh();
      },
      Math.max(1, refreshSeconds) * 1000,
    );
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [refresh, refreshSeconds]);

  return { task, error, isLoading, refresh };
}

function taskActions(
  task: Aria2Task,
  refresh: () => void,
  onBack?: () => void,
  onShowDetails?: () => void,
  chunkViz?: "heatmap" | "mosaic",
  onToggleChunkView?: () => void,
): React.ReactNode {
  const isActive = isActiveTask(task);
  const isWaiting = isWaitingTask(task);
  const isStopped = isStoppedTask(task);
  const uri = getPrimaryUri(task);

  return (
    <ActionPanel>
      {onShowDetails && (
        <Action
          title="Show Metadata"
          icon={Icon.Info}
          onAction={onShowDetails}
        />
      )}
      {onToggleChunkView && (
        <Action
          title={
            chunkViz === "mosaic"
              ? "Switch to Heatmap"
              : "Switch to Native Mosaic"
          }
          icon={Icon.AppWindowGrid3x3}
          shortcut={{ modifiers: ["ctrl"], key: "m" }}
          onAction={onToggleChunkView}
        />
      )}
      {isActive && (
        <Action
          title="Pause"
          icon={Icon.Pause}
          shortcut={{ modifiers: ["ctrl"], key: "p" }}
          onAction={async () => {
            try {
              await pauseTask(task.gid);
              await showToast({ style: Toast.Style.Success, title: "Paused" });
              refresh();
            } catch (error) {
              await showToast({
                style: Toast.Style.Failure,
                title: "Pause failed",
                message: messageOf(error),
              });
            }
          }}
        />
      )}
      {isWaiting && (
        <Action
          title="Resume"
          icon={Icon.Play}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={async () => {
            try {
              await resumeTask(task.gid);
              await showToast({ style: Toast.Style.Success, title: "Resumed" });
              refresh();
            } catch (error) {
              await showToast({
                style: Toast.Style.Failure,
                title: "Resume failed",
                message: messageOf(error),
              });
            }
          }}
        />
      )}
      <Action
        title="Remove"
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        onAction={async () => {
          const confirmed = await confirmAlert({
            title: "Remove download?",
            message: `Remove "${getTaskName(task)}" from aria2?`,
            primaryAction: {
              title: "Remove",
              style: Alert.ActionStyle.Destructive,
            },
          });
          if (!confirmed) return;
          try {
            if (isStopped) await removeTaskResult(task.gid);
            else await removeTask(task.gid);
            await showToast({ style: Toast.Style.Success, title: "Removed" });
            if (onBack) {
              onBack();
            } else {
              refresh();
            }
          } catch (error) {
            await showToast({
              style: Toast.Style.Failure,
              title: "Remove failed",
              message: messageOf(error),
            });
          }
        }}
      />
      <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={refresh} />
      {task.dir && (
        <Action
          title="Open Download Folder"
          icon={Icon.Folder}
          onAction={() => open(task.dir)}
        />
      )}
      {uri && <Action.CopyToClipboard title="Copy Source URL" content={uri} />}
      {onBack && (
        <ActionPanel.Section>
          <Action title="Back" icon={Icon.ArrowLeft} onAction={onBack} />
        </ActionPanel.Section>
      )}
    </ActionPanel>
  );
}

function metadataFor(task: Aria2Task) {
  const progress = getTaskProgress(task);
  const kind = getTaskKind(task);
  const metadata = isMetadataTask(task);
  const status = metadata
    ? "Waiting for metadata"
    : getTaskStatusLabel(task.status);
  const error = getTaskError(task);
  const fileCount = getFileCount(task);
  const numPieces = Number.parseInt(task.numPieces ?? "0", 10);

  return (
    <Detail.Metadata>
      <Detail.Metadata.Label title="Status" text={status} />
      <Detail.Metadata.Label
        title="Progress"
        text={metadata ? "—" : `${progress.toFixed(1)}%`}
      />
      <Detail.Metadata.Label title="Type" text={getTaskKindLabel(kind)} />
      <Detail.Metadata.Label
        title="Size"
        text={formatBytes(task.totalLength)}
      />
      <Detail.Metadata.Label
        title="Completed"
        text={formatBytes(task.completedLength)}
      />
      <Detail.Metadata.Label
        title="Speed"
        text={formatSpeed(task.downloadSpeed)}
      />
      <Detail.Metadata.Label
        title="ETA"
        text={
          metadata
            ? "waiting"
            : formatEta(
                task.totalLength,
                task.completedLength,
                task.downloadSpeed,
              )
        }
      />
      <Detail.Metadata.Label
        title="Connections"
        text={task.connections || "0"}
      />
      <Detail.Metadata.Label
        title="Pieces"
        text={
          Number.isFinite(numPieces) && numPieces > 0 ? `${numPieces}` : "—"
        }
      />
      <Detail.Metadata.Label
        title="Piece Size"
        text={task.pieceLength ? formatBytes(task.pieceLength) : "—"}
      />
      <Detail.Metadata.Label
        title="Files"
        text={fileCount > 0 ? `${fileCount}` : "—"}
      />
      <Detail.Metadata.Separator />
      <Detail.Metadata.Label title="Directory" text={task.dir || "—"} />
      <Detail.Metadata.Label title="GID" text={task.gid} />
      {error && <Detail.Metadata.Label title="Error" text={error} />}
    </Detail.Metadata>
  );
}

function TaskMetadataDetail({ task }: { task: Aria2Task }) {
  const { pop } = useNavigation();
  return (
    <Detail
      navigationTitle={getTaskName(task)}
      markdown={[
        `# ${getTaskName(task)}`,
        "",
        isMetadataTask(task)
          ? `Waiting for metadata · ${task.connections || "0"} peers`
          : `**${getTaskProgress(task).toFixed(1)}%** · ${formatSpeed(task.downloadSpeed)} · ETA ${formatEta(
              task.totalLength,
              task.completedLength,
              task.downloadSpeed,
            )}`,
        "",
        getTaskError(task) ? `> ${getTaskError(task)}` : "",
      ]
        .filter(Boolean)
        .join("\n")}
      metadata={metadataFor(task)}
      actions={
        <ActionPanel>
          <Action title="Back" icon={Icon.ArrowLeft} onAction={pop} />
        </ActionPanel>
      }
    />
  );
}

function MosaicDetail({
  task,
  refresh,
  chunkViz,
  onToggleChunkView,
}: {
  task: Aria2Task;
  refresh: () => void;
  chunkViz: "heatmap" | "mosaic";
  onToggleChunkView: () => void;
}) {
  const columns = 8;
  const numPieces = Number.parseInt(task.numPieces ?? "0", 10);
  const grid = aggregateBitfield(task.bitfield, numPieces, columns, 12);
  const progress = getTaskProgress(task);
  const { push, pop } = useNavigation();

  if (!grid) {
    return (
      <Detail
        isLoading={false}
        navigationTitle={getTaskName(task)}
        markdown={[
          `# ${getTaskName(task)}`,
          "",
          task.status === "complete"
            ? "Completed."
            : "Waiting for aria2 piece information…",
          "",
          `**${progress.toFixed(1)}%** · ${formatSpeed(task.downloadSpeed)}`,
        ].join("\n")}
        metadata={metadataFor(task)}
        actions={taskActions(
          task,
          refresh,
          pop,
          undefined,
          chunkViz,
          onToggleChunkView,
        )}
      />
    );
  }

  const cells = grid.fractions.flatMap((row, rowIndex) =>
    row.map((fraction, columnIndex) => ({
      key: `${rowIndex}-${columnIndex}`,
      fraction,
    })),
  );

  return (
    <Grid
      navigationTitle={`${getTaskName(task)} · ${progress.toFixed(1)}%`}
      searchBarPlaceholder={`${getTaskKindLabel(getTaskKind(task))} · ${formatSpeed(task.downloadSpeed)} · ETA ${formatEta(
        task.totalLength,
        task.completedLength,
        task.downloadSpeed,
      )}`}
      columns={8}
      aspectRatio="1"
      fit={Grid.Fit.Fill}
      inset={Grid.Inset.Small}
      actions={taskActions(
        task,
        refresh,
        pop,
        () => push(<TaskMetadataDetail task={task} />),
        chunkViz,
        onToggleChunkView,
      )}
    >
      {cells.map((cell) => (
        <Grid.Item
          key={cell.key}
          content={{
            color:
              cell.fraction >= 0.999
                ? Color.Green
                : cell.fraction > 0
                  ? Color.Yellow
                  : Color.SecondaryText,
          }}
          actions={taskActions(task, refresh, undefined, () =>
            push(<TaskMetadataDetail task={task} />),
          )}
        />
      ))}
    </Grid>
  );
}

export default function TaskDetail({ gid }: TaskDetailProps) {
  const preferences = getPreferenceValues<ExtensionPreferences>();
  const refreshSeconds = Math.max(
    1,
    Number.parseInt(preferences.refreshInterval || "1", 10),
  );
  const { task, error, isLoading, refresh } = useTaskStatus(
    gid,
    refreshSeconds,
  );
  const { pop } = useNavigation();
  const [chunkViz, setChunkViz] = useState<"heatmap" | "mosaic">(
    preferences.chunkViz,
  );
  const [heatmapPath, setHeatmapPath] = useState<string | null>(null);
  const [heatmapError, setHeatmapError] = useState(false);
  const lastHash = useRef<string | null>(null);

  const columns = Math.max(
    16,
    Math.min(64, Number.parseInt(preferences.chunkColumns || "48", 10)),
  );
  const numPieces = Number.parseInt(task?.numPieces ?? "0", 10);
  const bitfield = task?.bitfield;
  const grid = useMemo(
    () => aggregateBitfield(bitfield, numPieces, columns, 12),
    [bitfield, numPieces, columns],
  );

  useEffect(() => {
    if (!task || chunkViz === "mosaic" || !grid) {
      setHeatmapPath(null);
      setHeatmapError(false);
      return;
    }
    if (numPieces > MAX_RENDERABLE_PIECES) {
      setHeatmapPath(null);
      setHeatmapError(true);
      return;
    }
    const hash = hashBitfield(task.bitfield, grid);
    if (lastHash.current === hash && heatmapPath) return;
    lastHash.current = hash;
    let cancelled = false;
    void writeHeatmapFile(task.gid, grid, hash, environment.appearance)
      .then((file) => {
        if (!cancelled) {
          setHeatmapPath(file.filePath);
          setHeatmapError(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHeatmapPath(null);
          setHeatmapError(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [task, grid, heatmapPath, numPieces, chunkViz]);

  if (chunkViz === "mosaic" && task) {
    return (
      <MosaicDetail
        task={task}
        refresh={refresh}
        chunkViz={chunkViz}
        onToggleChunkView={() =>
          setChunkViz((current) =>
            current === "mosaic" ? "heatmap" : "mosaic",
          )
        }
      />
    );
  }

  if (!task) {
    return (
      <Detail
        isLoading={isLoading}
        navigationTitle="Aria2 Task"
        markdown={
          error ? `# Could not read task\n\n${error}` : "# Loading task…"
        }
        actions={
          <ActionPanel>
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={refresh}
            />
            <Action title="Back" icon={Icon.ArrowLeft} onAction={pop} />
          </ActionPanel>
        }
      />
    );
  }

  const progress = getTaskProgress(task);
  const kind = getTaskKind(task);
  const errorText = getTaskError(task);
  const bitfieldAvailable = grid !== null && task.bitfield !== undefined;
  const fileLines =
    task.files && task.files.length > 0
      ? task.files
          .slice(0, 30)
          .map((file) => {
            const fileProgress = formatPercent(
              file.completedLength,
              file.length,
            );
            return `- ${file.path || "(unnamed)"} · ${fileProgress.toFixed(0)}%`;
          })
          .join("\n")
      : "";

  const markdown = [
    `# ${getTaskName(task)}`,
    "",
    isMetadataTask(task)
      ? `Waiting for metadata · ${task.connections || "0"} peers`
      : `**${progress.toFixed(1)}%** · ${getTaskKindLabel(kind)} · ${formatSpeed(task.downloadSpeed)} · ETA ${formatEta(
          task.totalLength,
          task.completedLength,
          task.downloadSpeed,
        )}`,
    "",
    heatmapPath
      ? heatmapMarkdown(heatmapPath)
      : heatmapError
        ? "Heatmap image is unavailable. Switch **Chunk View** to **Native Mosaic** in the extension preferences."
        : bitfieldAvailable
          ? "Rendering chunk map…"
          : task.bittorrent && !task.bitfield
            ? "Waiting for aria2 piece information…"
            : "No chunk information yet. This is normal before the download starts.",
    "",
    errorText ? `> ${errorText}` : "",
    fileLines ? `### Files\n\n${fileLines}` : "",
  ]
    .filter((line) => line !== undefined)
    .join("\n");

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`${getTaskName(task)} · ${progress.toFixed(0)}%`}
      markdown={markdown}
      metadata={metadataFor(task)}
      actions={taskActions(task, refresh, pop, undefined, chunkViz, () =>
        setChunkViz((current) => (current === "mosaic" ? "heatmap" : "mosaic")),
      )}
    />
  );
}
