import { homedir } from "node:os";
import { join } from "node:path";
import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  confirmAlert,
  Detail,
  getPreferenceValues,
  Icon,
  List,
  open,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useState } from "react";
import { EditCallMetadata, SummarizeCall } from "./call-ai";
import { CallDraft } from "./lib/ai";
import { TupleErrorDetail, TupleErrorEmptyView } from "./lib/empty-state";
import { useTupleJson } from "./lib/hooks";
import {
  classifyError,
  deleteCapture,
  exportCapture,
  getLocalClockCaptureMarkdown,
  getConnectPrompt,
  stripAnsi,
  stripMatchMarkers,
  captureSearchArgs,
  getCall,
} from "./lib/tuple";
import { StoredCall, CaptureMatch, TupleErrorKind } from "./lib/types";

/** Export destination: the user's preference, or ~/Downloads when unset. */
function exportDir(): string {
  const { exportDirectory } = getPreferenceValues<Preferences>();
  return exportDirectory?.trim() ? exportDirectory.trim() : join(homedir(), "Downloads");
}

export default function SearchCalls() {
  const [searchText, setSearchText] = useState("");
  const query = searchText;
  const searching = query.trim().length > 0;
  // Always loaded: drives the browse list and, while searching, resolves call titles for the
  // result sections (kept warm by keepPreviousData, so it doesn't re-run on each keystroke).
  const calls = useTupleJson<StoredCall[]>(["capture", "list", "--limit", "100"], {
    failureTitle: "Could Not Load Calls",
  });

  const matches = useTupleJson<CaptureMatch[]>(captureSearchArgs(query), {
    execute: searching,
    failureTitle: "Search Failed",
  });

  const isLoading = searching ? matches.isLoading : calls.isLoading;
  const error = searching ? matches.error : calls.error;
  // After a mutation, always revalidate the calls list (it's the title source for both the browse list
  // and the search-result section headers), plus the active search when there is one.
  const refresh = () => {
    calls.revalidate();
    if (searching) {
      matches.revalidate();
    }
  };

  return (
    <List
      isLoading={isLoading}
      throttle
      filtering={false}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Browse recent calls, or search what was said"
    >
      {searching
        ? groupMatchesByCall(matches.data ?? [], calls.data ?? []).map((group) => (
            <List.Section key={group.callId} title={group.title} subtitle={group.subtitle}>
              {group.matches.map((match, index) => (
                <MatchItem key={`${group.callId}-${index}`} match={match} call={group.call} onChange={refresh} />
              ))}
            </List.Section>
          ))
        : (calls.data ?? []).map((call) => <CallItem key={call.call_id} call={call} onChange={refresh} />)}
      {error ? (
        <TupleErrorEmptyView error={error} onRetry={searching ? matches.revalidate : calls.revalidate} />
      ) : searching ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No Matches"
          description="No captured conversations or shared content match your search."
        />
      ) : (
        <List.EmptyView
          icon={Icon.Phone}
          title="No Recent Calls"
          description="Calls with stored Capture will appear here."
        />
      )}
    </List>
  );
}

function CallItem({ call, onChange }: { call: StoredCall; onChange: () => void }) {
  const accessories: List.Item.Accessory[] = [
    { icon: Icon.TwoPeople, text: `${call.participants.length}`, tooltip: participantNames(call) },
  ];
  if (call.recordings > 0) {
    accessories.push({ icon: Icon.Video, text: `${call.recordings}`, tooltip: "Recordings" });
  }
  const started = toValidDate(call.started_at);
  if (started) {
    accessories.push({ date: started, tooltip: "Started" });
  }

  return (
    <List.Item
      icon={Icon.Phone}
      title={callTitle(call)}
      subtitle={durationLabel(call)}
      accessories={accessories}
      actions={<CallActions callId={call.call_id} call={call} onChange={onChange} />}
    />
  );
}

function MatchItem({ match, call, onChange }: { match: CaptureMatch; call?: StoredCall; onChange: () => void }) {
  const time = toValidDate(match.time);
  return (
    <List.Item
      icon={Icon.SpeechBubble}
      title={cleanSnippet(match.snippet)}
      subtitle={match.kind === "content" ? match.app_name || "Shared Content" : match.speaker}
      accessories={time ? [{ date: time }] : []}
      actions={<CallActions callId={match.call_id} call={call} onChange={onChange} />}
    />
  );
}

interface MatchGroup {
  callId: string;
  call?: StoredCall;
  title: string;
  subtitle: string;
  matches: CaptureMatch[];
  latest: number;
}

/** Group search hits by call — newest call first, each call's hits newest-first. */
function groupMatchesByCall(matches: CaptureMatch[], calls: StoredCall[]): MatchGroup[] {
  const callsById = new Map(calls.map((call) => [call.call_id, call]));
  const byCall = new Map<string, CaptureMatch[]>();
  for (const match of matches) {
    const existing = byCall.get(match.call_id);
    if (existing) {
      existing.push(match);
    } else {
      byCall.set(match.call_id, [match]);
    }
  }

  return [...byCall.entries()]
    .map(([callId, hits]) => {
      const sorted = [...hits].sort(byTimeDesc);
      const call = callsById.get(callId);
      return {
        callId,
        call,
        title: call ? callTitle(call) : "Call",
        subtitle: `${hits.length} ${hits.length === 1 ? "match" : "matches"}`,
        matches: sorted,
        latest: matchTime(sorted[0]),
      };
    })
    .sort((a, b) => b.latest - a.latest);
}

/** "Summarize with AI" action. `title` is the display title shown in the pushed view. */
function summarizeAction({
  callId,
  title,
  onApplied,
}: {
  callId: string;
  title: string;
  onApplied: (applied: CallDraft) => void;
}) {
  return (
    <Action.Push
      key="summarize"
      title="Summarize with AI"
      icon={Icon.Stars}
      shortcut={{ modifiers: ["cmd"], key: "j" }}
      target={<SummarizeCall callId={callId} title={title} onApplied={onApplied} />}
    />
  );
}

/** "Edit Title & Summary" action. Seeds the form with the raw stored title (empty when none), not the
 *  participant-derived display `title`, so editing never writes a fallback name back as a real title. */
function editMetadataAction({ callId, title, onApplied }: MetadataActionParams) {
  return (
    <Action.Push
      key="edit-metadata"
      title="Edit Title & Summary"
      icon={Icon.Pencil}
      shortcut={{ modifiers: ["cmd", "shift"], key: "j" }}
      target={<StoredCallEditor callId={callId} title={title} onApplied={onApplied} />}
    />
  );
}

function StoredCallEditor({
  callId,
  title,
  onApplied,
}: {
  callId: string;
  title: string;
  onApplied: (draft: CallDraft) => void;
}) {
  const metadata = usePromise(getCall, [callId], { onError: () => {} });
  if (metadata.error) return <TupleErrorDetail error={metadata.error} onRetry={metadata.revalidate} />;
  if (!metadata.data) return <Detail isLoading />;
  return (
    <EditCallMetadata
      callId={callId}
      title={title}
      draft={{ title: metadata.data.title ?? "", summary: metadata.data.summary ?? "" }}
      onApplied={onApplied}
    />
  );
}

interface MetadataActionParams {
  callId: string;
  title: string;
  summary: string;
  onApplied: (applied: CallDraft) => void;
}

/** The Summarize + Edit actions, ordered by intent: once a summary exists, editing it is the likelier
 *  next step, so lead with Edit and demote regeneration; before then, Summarize is the only move. */
function metadataActions(params: MetadataActionParams) {
  const summarize = summarizeAction(params);
  const edit = editMetadataAction(params);
  return params.summary ? (
    <>
      {edit}
      {summarize}
    </>
  ) : (
    <>
      {summarize}
      {edit}
    </>
  );
}

function CallActions({ callId, call, onChange }: { callId: string; call?: StoredCall; onChange: () => void }) {
  const title = call ? callTitle(call) : "Call";
  const summary = call?.summary?.trim() ?? "";
  return (
    <ActionPanel>
      <Action.Push
        title="View Capture"
        icon={Icon.Text}
        target={<CaptureDetail callId={callId} call={call} onChange={onChange} />}
      />
      {metadataActions({ callId, title, summary, onApplied: onChange })}
      <Action
        title="Copy AI Context"
        icon={Icon.Clipboard}
        shortcut={{ modifiers: ["opt"], key: "j" }}
        onAction={() => copyAiContext(callId)}
      />
      <Action
        title="Export Capture"
        icon={Icon.Download}
        shortcut={{ modifiers: ["cmd"], key: "e" }}
        onAction={() => exportWithFeedback(callId)}
      />
      <Action.CopyToClipboard title="Copy Call ID" content={callId} />
      <Action
        title="Delete Capture"
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        shortcut={{ modifiers: ["ctrl"], key: "x" }}
        onAction={() => deleteWithConfirm(callId, title, onChange)}
      />
    </ActionPanel>
  );
}

async function deleteWithConfirm(callId: string, title: string, onChange: () => void) {
  const confirmed = await confirmAlert({
    title: "Delete Capture?",
    message: `This permanently deletes the full stored Capture — conversation, events, shared content, and retained media — for “${title}”. This cannot be undone.`,
    icon: Icon.Trash,
    primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
  });
  if (!confirmed) {
    return;
  }
  try {
    await deleteCapture(callId);
    await showToast({ style: Toast.Style.Success, title: "Capture Deleted" });
    onChange();
  } catch (error) {
    await showFailureToast(error, { title: "Could Not Delete Capture" });
  }
}

function CaptureDetail({ callId, call, onChange }: { callId: string; call?: StoredCall; onChange?: () => void }) {
  const metadata = usePromise(getCall, [callId], { onError: () => {} });
  const [applied, setApplied] = useState<CallDraft>();
  const storedTitle = applied?.title ?? metadata.data?.title?.trim() ?? call?.title?.trim() ?? "";
  const summary = applied?.summary ?? metadata.data?.summary?.trim() ?? call?.summary?.trim() ?? "";
  const title = storedTitle || (call ? callTitle(call) : "Capture");
  const handleApplied = (draft: CallDraft) => {
    setApplied({ title: draft.title || storedTitle, summary: draft.summary });
    metadata.revalidate();
    onChange?.();
  };

  const { data, isLoading, error, revalidate } = usePromise(getLocalClockCaptureMarkdown, [callId], {
    onError: async (error) => {
      if (classifyError(error).kind === TupleErrorKind.Unknown) {
        await showFailureToast(error, { title: "Could Not Load Capture" });
      }
    },
  });

  if (error || metadata.error) {
    return (
      <TupleErrorDetail
        error={error || metadata.error!}
        onRetry={() => {
          revalidate();
          metadata.revalidate();
        }}
      />
    );
  }

  return (
    <Detail
      isLoading={isLoading || metadata.isLoading}
      navigationTitle={title}
      markdown={buildCaptureMarkdown(title, summary, data)}
      actions={
        <ActionPanel>
          {metadataActions({ callId, title, summary, onApplied: handleApplied })}
          <Action title="Copy AI Context" icon={Icon.Clipboard} onAction={() => copyAiContext(callId)} />
          <Action
            title="Export Capture"
            icon={Icon.Download}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
            onAction={() => exportWithFeedback(callId)}
          />
          <Action.CopyToClipboard title="Copy Call ID" content={callId} />
        </ActionPanel>
      }
    />
  );
}

async function copyAiContext(callId: string) {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Building AI context…" });
  try {
    const prompt = await getConnectPrompt(callId);
    await Clipboard.copy(prompt);
    toast.style = Toast.Style.Success;
    toast.title = "Copied AI Context";
    toast.message = "Paste it into your assistant";
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could Not Build AI Context";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}

async function exportWithFeedback(callId: string) {
  const dir = exportDir();
  const file = join(dir, `tuple-capture-${callId.replace(/[^a-zA-Z0-9-]/g, "_")}-${Date.now()}.jsonl`);
  const toast = await showToast({ style: Toast.Style.Animated, title: "Exporting Capture…" });
  try {
    await exportCapture(file, callId);
    toast.style = Toast.Style.Success;
    toast.title = "Capture Exported";
    toast.message = file;
    toast.primaryAction = {
      title: "Open Folder",
      onAction: () => {
        open(dir);
      },
    };
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could Not Export Capture";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}

function buildCaptureMarkdown(title: string, summary: string, capture: string | undefined): string {
  const heading = `# ${title}`;
  const summaryBlock = summary.trim() ? `\n\n${summary.trim()}` : "";
  const cleaned = capture ? formatCaptureText(capture) : "";
  const body = cleaned ? `\n\n---\n\n${cleaned}` : "\n\n_No Capture records available._";
  return `${heading}${summaryBlock}${body}`;
}

/** Strip the CLI's ANSI color codes and put each utterance on its own line so markdown doesn't run them together. */
function formatCaptureText(raw: string): string {
  return stripAnsi(raw)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n\n");
}

/**
 * The CLI caps search by FTS rank before returning a page, while this occurrence view presents that
 * returned page newest-first. Sorting here cannot recover newer matches outside the CLI limit.
 */
function byTimeDesc(a: CaptureMatch, b: CaptureMatch): number {
  return matchTime(b) - matchTime(a);
}

function matchTime(match: CaptureMatch): number {
  const time = new Date(match.time).getTime();
  return Number.isNaN(time) ? 0 : time;
}

/** Parse a CLI timestamp, returning undefined for missing or unparseable values. */
function toValidDate(value: string | undefined): Date | undefined {
  if (!value) {
    return undefined;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function callTitle(call: StoredCall): string {
  if (call.title.trim()) {
    return call.title.trim();
  }
  const names = call.participants.map((participant) => participant.full_name);
  if (names.length === 0) {
    return "Untitled Call";
  }
  if (names.length <= 3) {
    return names.join(", ");
  }
  return `${names.slice(0, 3).join(", ")} +${names.length - 3}`;
}

function participantNames(call: StoredCall): string {
  return call.participants.map((participant) => participant.full_name).join(", ");
}

function durationLabel(call: StoredCall): string {
  const start = new Date(call.started_at).getTime();
  const end = new Date(call.ended_at).getTime();
  const minutes = Math.round((end - start) / 60000);
  if (!Number.isFinite(minutes) || minutes < 0) {
    return `${call.segments} segments`;
  }
  if (minutes < 60) {
    return `${minutes} min`;
  }
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

/** Collapse a search snippet (markers stripped) to a one-line title. */
function cleanSnippet(snippet: string): string {
  return stripMatchMarkers(snippet).replace(/\s+/g, " ").trim();
}
