import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  confirmAlert,
  Alert,
  showHUD,
} from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { readFile } from "fs/promises";
import { homedir } from "os";
import path from "path";

const PID_FILE = path.join(
  homedir(),
  "Library",
  "Logs",
  "raycast-photo-ingest.pid",
);
const LOG_FILE = path.join(
  homedir(),
  "Library",
  "Logs",
  "raycast-photo-ingest.log",
);

interface CardInfo {
  name: string;
  fileCount: number;
}

interface ProgressInfo {
  pid: number;
  startedAt: string;
  destDir: string;
  cards: CardInfo[];
  stage: string;
  progress: { current: number; total: number };
  currentFile?: string;
  filePercent?: number;
  error?: string | null;
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

const STAGE_LABELS: Record<string, string> = {
  scanning: "Scanning cards",
  filtering: "Filtering files",
  copying: "Copying files",
  verifying: "Verifying checksums",
  renaming: "Renaming files",
  ejecting: "Ejecting cards",
};

function formatElapsed(start: Date): string {
  const s = Math.floor((Date.now() - start.getTime()) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function progressBar(current: number, total: number, width = 10): string {
  if (total === 0) return "";
  const filled = Math.round((current / total) * width);
  return "■".repeat(filled) + "□".repeat(width - filled);
}

export function IngestStatusView({
  onNoActiveSession,
}: {
  onNoActiveSession?: () => void;
}) {
  const [info, setInfo] = useState<ProgressInfo | null>(null);
  const [alive, setAlive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const raw = await readFile(PID_FILE, "utf-8");
      const parsed: ProgressInfo = JSON.parse(raw);
      setInfo(parsed);
      const running = isProcessAlive(parsed.pid) && parsed.stage !== "done";
      setAlive(running);

      if (!running && onNoActiveSession) {
        onNoActiveSession();
      }
    } catch {
      setInfo(null);
      setAlive(false);
      if (onNoActiveSession) {
        onNoActiveSession();
      }
    }
    setIsLoading(false);
  }, [onNoActiveSession]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 1000);
    return () => clearInterval(t);
  }, [refresh]);

  const stopIngest = useCallback(async () => {
    if (!info) return;
    const confirmed = await confirmAlert({
      title: "Stop Ingest?",
      message: "Files already copied will remain in the destination folder.",
      primaryAction: { title: "Stop", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    try {
      process.kill(info.pid, "SIGTERM");
      await showHUD("🛑 Ingest stopped");
      setTimeout(refresh, 500);
    } catch {
      await showHUD("Could not stop process");
    }
  }, [info, refresh]);

  if (!isLoading && (!info || !alive)) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Camera}
          title="No Active Ingest"
          description="Start one from Magic Ingest"
          actions={
            onNoActiveSession && (
              <ActionPanel>
                <Action title="Continue" onAction={onNoActiveSession} />
              </ActionPanel>
            )
          }
        />
      </List>
    );
  }

  const {
    stage,
    progress,
    cards,
    destDir,
    startedAt,
    currentFile,
    filePercent,
  } = info ?? {
    stage: "",
    progress: { current: 0, total: 0 },
    cards: [],
    destDir: "",
    startedAt: new Date().toISOString(),
    currentFile: undefined,
    filePercent: undefined,
  };

  const stageLabel = STAGE_LABELS[stage] || stage;
  const elapsed = formatElapsed(new Date(startedAt));
  const pct =
    progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : 0;
  const bar =
    progress.total > 0 ? progressBar(progress.current, progress.total, 20) : "";

  const errorMsg = info?.error ?? null;

  let subtitle: string | undefined;
  if (progress.total > 0) {
    subtitle = `${bar}  ${progress.current}/${progress.total}  (${pct}%)`;
    if (currentFile) {
      subtitle += `  ·  ${currentFile} ${filePercent ?? 0}%`;
    }
  }

  return (
    <List isLoading={isLoading}>
      <List.Section title="Ingest Progress">
        <List.Item
          icon={{ source: Icon.Camera, tintColor: Color.Purple }}
          title={stageLabel}
          subtitle={subtitle}
          accessories={[{ text: elapsed, icon: Icon.Clock }]}
          actions={
            <ActionPanel>
              <Action
                title="Stop Ingest"
                icon={Icon.Stop}
                style={Action.Style.Destructive}
                onAction={stopIngest}
              />
              <Action.ShowInFinder title="Show Destination" path={destDir} />
              <Action.Open
                title="Open Log"
                target={LOG_FILE}
                icon={Icon.Document}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      {errorMsg && (
        <List.Section title="Error">
          <List.Item
            icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
            title={errorMsg}
          />
        </List.Section>
      )}

      <List.Section title="Source Cards">
        {cards.map((card) => (
          <List.Item
            key={card.name}
            icon={{ source: Icon.MemoryChip, tintColor: Color.Blue }}
            title={card.name}
            accessories={[{ text: `${card.fileCount} files` }]}
          />
        ))}
      </List.Section>

      <List.Section title="Destination">
        <List.Item
          icon={Icon.Folder}
          title={path.basename(destDir)}
          subtitle={destDir}
          actions={
            <ActionPanel>
              <Action.ShowInFinder path={destDir} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
