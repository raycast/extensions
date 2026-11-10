import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { showFailureToast, useCachedPromise, usePromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { JobView, resultMarkdown } from "./components/JobView";
import { ResultActions } from "./components/ResultActions";
import { downloadResult, getClient, outputDirectory } from "./lib/files";
import {
  clearHistory,
  deleteRecord,
  getHistory,
  HistoryRecord,
  isImageKind,
  JobKind,
  KIND_TITLES,
  updateRecord,
} from "./lib/history";
import { jobErrorMessage } from "./lib/api";
import { transcriptionText } from "./lib/jobs";

const KIND_ICONS: Record<JobKind, Icon> = {
  image: Icon.Image,
  edit: Icon.Pencil,
  video: Icon.FilmStrip,
  speech: Icon.SpeakerOn,
  transcription: Icon.Text,
  background: Icon.Eraser,
  upscale: Icon.Maximize,
};

export default function Command() {
  const [kind, setKind] = useState<string>("all");
  const { data: records = [], isLoading, revalidate } = usePromise(getHistory);
  const { data: balance } = useCachedPromise(() => getClient().getBalance(), [], {
    onError: () => undefined,
  });

  // Check jobs that were still running when their window was closed.
  useEffect(() => {
    const pending = records.filter((record) => record.status === "pending");
    if (pending.length === 0) return;
    let cancelled = false;
    (async () => {
      let changed = false;
      for (const record of pending) {
        if (cancelled) return;
        changed = (await refresh(record, { quiet: true })) || changed;
      }
      if (changed && !cancelled) revalidate();
    })();
    return () => {
      cancelled = true;
    };
  }, [records.length]);

  const visible = kind === "all" ? records : records.filter((record) => record.kind === kind);
  const balanceText = balance ? `Balance: $${balance.balance.toFixed(2)}` : undefined;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={visible.length > 0}
      navigationTitle={balanceText ? `Generation History · ${balanceText}` : undefined}
      searchBarPlaceholder="Search prompts and models"
      searchBarAccessory={
        <List.Dropdown tooltip="Type" value={kind} onChange={setKind}>
          <List.Dropdown.Item title="All Types" value="all" />
          {(Object.keys(KIND_TITLES) as JobKind[]).map((item) => (
            <List.Dropdown.Item key={item} title={KIND_TITLES[item]} value={item} icon={KIND_ICONS[item]} />
          ))}
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={Icon.Stars}
        title="Nothing here yet"
        description={`Results from the deAPI commands appear here and are saved to ${outputDirectory()}.${
          balanceText ? `\n${balanceText}` : ""
        }`}
      />
      {visible.map((record) => (
        <List.Item
          key={record.requestId}
          title={record.input || KIND_TITLES[record.kind]}
          icon={
            record.kind && isImageKind(record.kind) && record.filePath
              ? { source: record.filePath }
              : KIND_ICONS[record.kind]
          }
          keywords={[record.model, KIND_TITLES[record.kind]]}
          accessories={[statusAccessory(record), { date: new Date(record.createdAt) }]}
          detail={<List.Item.Detail markdown={detailMarkdown(record)} metadata={<RecordMetadata record={record} />} />}
          actions={
            <ResultActions
              record={record}
              extra={
                <ActionPanel.Section>
                  {record.status === "pending" ? (
                    <Action.Push
                      title="Follow Job"
                      icon={Icon.Clock}
                      target={<JobView kind={record.kind} model={record.model} input={record.input} record={record} />}
                      onPop={revalidate}
                    />
                  ) : null}
                  {record.status !== "done" ? (
                    <Action
                      title="Check Status"
                      icon={Icon.ArrowClockwise}
                      shortcut={Keyboard.Shortcut.Common.Refresh}
                      onAction={async () => {
                        await refresh(record, { quiet: false });
                        revalidate();
                      }}
                    />
                  ) : null}
                  <Action.CopyToClipboard title="Copy Request ID" content={record.requestId} />
                  <Action
                    title="Remove from History"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    onAction={async () => {
                      await deleteRecord(record.requestId);
                      revalidate();
                    }}
                  />
                  <Action
                    title="Clear History"
                    icon={Icon.XMarkCircle}
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.RemoveAll}
                    onAction={async () => {
                      const confirmed = await confirmAlert({
                        title: "Clear the generation history?",
                        message: "Saved files stay on your computer.",
                        primaryAction: { title: "Clear History", style: Alert.ActionStyle.Destructive },
                      });
                      if (!confirmed) return;
                      await clearHistory();
                      revalidate();
                    }}
                  />
                </ActionPanel.Section>
              }
            />
          }
        />
      ))}
    </List>
  );
}

/** Checks a job once and stores the result. Returns true if the record changed. */
async function refresh(record: HistoryRecord, options: { quiet: boolean }): Promise<boolean> {
  try {
    const job = await getClient().getJob(record.requestId);
    if (job.status === "error") {
      await updateRecord(record.requestId, { status: "error", error: jobErrorMessage(job) });
      return true;
    }
    if (job.status !== "done") {
      if (!options.quiet) await showToast({ style: Toast.Style.Animated, title: "Still running" });
      return false;
    }
    const changes: Partial<HistoryRecord> = { status: "done", resultUrl: job.result_url ?? undefined };
    if (record.kind === "transcription") {
      changes.text = await transcriptionText(job);
    } else if (job.result_url) {
      changes.filePath = await downloadResult(job.result_url, record.kind, record.requestId);
    }
    await updateRecord(record.requestId, changes);
    if (!options.quiet) await showToast({ style: Toast.Style.Success, title: `${KIND_TITLES[record.kind]} ready` });
    return true;
  } catch (error) {
    if (!options.quiet) await showFailureToast(error, { title: "Could not check the job" });
    return false;
  }
}

function statusAccessory(record: HistoryRecord): List.Item.Accessory {
  if (record.status === "pending") return { icon: { source: Icon.Clock, tintColor: Color.Orange }, tooltip: "Running" };
  if (record.status === "error")
    return { icon: { source: Icon.XMarkCircle, tintColor: Color.Red }, tooltip: record.error };
  return { icon: { source: Icon.CheckCircle, tintColor: Color.Green }, tooltip: "Done" };
}

function detailMarkdown(record: HistoryRecord): string {
  if (record.status === "pending") return "## Still running\n\nPress **Enter** to follow the job.";
  if (record.status === "error") return `## Failed\n\n${record.error ?? "Unknown error"}`;
  return resultMarkdown(record);
}

function RecordMetadata(props: { record: HistoryRecord }) {
  const { record } = props;
  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Type" text={KIND_TITLES[record.kind]} icon={KIND_ICONS[record.kind]} />
      <List.Item.Detail.Metadata.Label title="Model" text={record.model} />
      {record.width && record.height ? (
        <List.Item.Detail.Metadata.Label title="Size" text={`${record.width} × ${record.height}`} />
      ) : null}
      <List.Item.Detail.Metadata.Label title="Created" text={new Date(record.createdAt).toLocaleString()} />
      {record.filePath ? <List.Item.Detail.Metadata.Label title="Saved To" text={record.filePath} /> : null}
    </List.Item.Detail.Metadata>
  );
}
