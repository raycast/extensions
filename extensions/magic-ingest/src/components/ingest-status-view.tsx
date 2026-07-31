import { List, ActionPanel, Action, Icon, Color, confirmAlert, Alert, showHUD, useNavigation } from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { JobState, readJobState, isProcessAlive } from "../utils/jobs";
import { LOG_FILE } from "../utils/constants";
import { STAGE_LABELS, progressBar, formatElapsed } from "../utils/format";

export function IngestStatusView({ jobId }: { jobId: string }) {
  const { pop } = useNavigation();
  const [info, setInfo] = useState<JobState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const parsed = await readJobState(jobId);
    setInfo(parsed);
    setIsLoading(false);
  }, [jobId]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 1000);
    return () => clearInterval(t);
  }, [refresh]);

  const alive = info != null && isProcessAlive(info.pid) && info.stage !== "done";

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

  if (!isLoading && !info) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Camera}
          title="Job Not Found"
          description="This ingest has finished or its state file is gone."
          actions={
            <ActionPanel>
              <Action title="Back" onAction={pop} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const { stage, progress, cards, destDir, startedAt, currentFile, filePercent } = info ?? {
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
  const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;
  const bar = progress.total > 0 ? progressBar(progress.current, progress.total, 20) : "";

  const errorMsg = info?.error ?? null;

  let subtitle: string | undefined;
  if (progress.total > 0) {
    subtitle = `${bar}  ${progress.current}/${progress.total}  (${pct}%)`;
    if (currentFile) {
      subtitle += `  ·  ${currentFile} ${filePercent ?? 0}%`;
    }
  }

  return (
    <List isLoading={isLoading} navigationTitle={info?.folderName ?? "Ingest"}>
      <List.Section title={alive ? "Ingest Progress" : "Finished"}>
        <List.Item
          icon={{
            source: Icon.Camera,
            tintColor: alive ? Color.Purple : Color.SecondaryText,
          }}
          title={stageLabel}
          subtitle={subtitle}
          accessories={[{ text: elapsed, icon: Icon.Clock }]}
          actions={
            <ActionPanel>
              {alive && (
                <Action title="Stop Ingest" icon={Icon.Stop} style={Action.Style.Destructive} onAction={stopIngest} />
              )}
              <Action.ShowInFinder title="Show Destination" path={destDir} />
              <Action.Open title="Open Log" target={LOG_FILE} icon={Icon.Document} />
              <Action title="Back" onAction={pop} />
            </ActionPanel>
          }
        />
      </List.Section>

      {errorMsg && (
        <List.Section title="Error">
          <List.Item icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }} title={errorMsg} />
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
          title={destDir.split("/").pop() ?? destDir}
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
