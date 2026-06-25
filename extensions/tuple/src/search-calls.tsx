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
import { showFailureToast, useExec } from "@raycast/utils";
import { useState } from "react";
import { GenerateCallMetadata, SummarizeCall } from "./call-ai";
import { stripMatchMarkers } from "./lib/call";
import { TupleErrorDetail, TupleErrorEmptyView } from "./lib/empty-state";
import { tupleExecOptions, useTupleJson } from "./lib/hooks";
import {
  classifyError,
  deleteTranscript,
  exportTranscripts,
  getBinaryPath,
  getConnectPrompt,
  stripAnsi,
  toFtsQuery,
} from "./lib/tuple";
import { StoredCall, TranscriptMatch, TupleErrorKind } from "./lib/types";

/** Export destination: the user's preference, or ~/Downloads when unset. */
function exportDir(): string {
  const { exportDirectory } = getPreferenceValues<Preferences>();
  return exportDirectory?.trim() ? exportDirectory.trim() : join(homedir(), "Downloads");
}

export default function SearchCalls() {
  const [searchText, setSearchText] = useState("");
  const query = searchText.trim();
  const searching = query.length > 0;
  // The CLI's `transcription search` parses FTS5 syntax, so raw input with hyphens, colons, or
  // operator keywords would error. Quote each term (same path the AI tool uses) before searching.
  const ftsQuery = toFtsQuery(query);

  // Always loaded: drives the browse list and, while searching, resolves call titles for the
  // result sections (kept warm by keepPreviousData, so it doesn't re-run on each keystroke).
  const calls = useTupleJson<StoredCall[]>(["transcription", "list"], {
    failureTitle: "Could Not Load Calls",
  });

  const matches = useTupleJson<TranscriptMatch[]>(["transcription", "search", ftsQuery, "--limit", "50"], {
    execute: searching && ftsQuery.length > 0,
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
          description="No transcript segments match your search."
        />
      ) : (
        <List.EmptyView
          icon={Icon.Phone}
          title="No Recent Calls"
          description="Recorded calls with transcripts will appear here."
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

function MatchItem({ match, call, onChange }: { match: TranscriptMatch; call?: StoredCall; onChange: () => void }) {
  const time = toValidDate(match.time);
  return (
    <List.Item
      icon={Icon.SpeechBubble}
      title={cleanSnippet(match.snippet)}
      subtitle={match.speaker}
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
  matches: TranscriptMatch[];
  latest: number;
}

/** Group search hits by call — newest call first, each call's hits newest-first. */
function groupMatchesByCall(matches: TranscriptMatch[], calls: StoredCall[]): MatchGroup[] {
  const callsById = new Map(calls.map((call) => [call.call_id, call]));
  const byCall = new Map<string, TranscriptMatch[]>();
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

function CallActions({ callId, call, onChange }: { callId: string; call?: StoredCall; onChange: () => void }) {
  const title = call ? callTitle(call) : "Call";
  return (
    <ActionPanel>
      <Action.Push
        title="View Transcript"
        icon={Icon.Text}
        target={<TranscriptDetail callId={callId} call={call} onChange={onChange} />}
      />
      <Action.Push
        title="Summarize with AI"
        icon={Icon.Stars}
        shortcut={{ modifiers: ["cmd"], key: "j" }}
        target={<SummarizeCall callId={callId} title={title} onApplied={onChange} />}
      />
      <Action.Push
        title="Generate Title & Summary…"
        icon={Icon.Stars}
        shortcut={{ modifiers: ["cmd", "shift"], key: "j" }}
        target={<GenerateCallMetadata callId={callId} title={title} onApplied={onChange} />}
      />
      <Action
        title="Copy AI Context"
        icon={Icon.Clipboard}
        shortcut={{ modifiers: ["opt"], key: "j" }}
        onAction={() => copyAiContext(callId)}
      />
      <Action
        title="Export Transcript"
        icon={Icon.Download}
        shortcut={{ modifiers: ["cmd"], key: "e" }}
        onAction={() => exportWithFeedback(callId)}
      />
      <Action.CopyToClipboard title="Copy Call ID" content={callId} />
      <Action
        title="Delete Transcript"
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
    title: "Delete Transcript?",
    message: `This permanently deletes the recording and transcript for “${title}”. This cannot be undone.`,
    icon: Icon.Trash,
    primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
  });
  if (!confirmed) {
    return;
  }
  try {
    await deleteTranscript(callId);
    await showToast({ style: Toast.Style.Success, title: "Transcript Deleted" });
    onChange();
  } catch (error) {
    await showFailureToast(error, { title: "Could Not Delete Transcript" });
  }
}

function TranscriptDetail({ callId, call, onChange }: { callId: string; call?: StoredCall; onChange?: () => void }) {
  const fallbackTitle = call ? callTitle(call) : "Transcript";
  // Title/summary come from the (frozen) call prop, so hold them in state and update on apply —
  // there's no metadata hook on this view to revalidate, and the transcript text itself doesn't change.
  const [title, setTitle] = useState(fallbackTitle);
  const [summary, setSummary] = useState(call?.summary?.trim() ?? "");

  const { data, isLoading, error, revalidate } = useExec(getBinaryPath(), ["transcription", "show", callId], {
    ...tupleExecOptions(),
    keepPreviousData: true,
    onError: async (error) => {
      if (classifyError(error).kind === TupleErrorKind.Unknown) {
        await showFailureToast(error, { title: "Could Not Load Transcript" });
      }
    },
  });

  if (error) {
    return <TupleErrorDetail error={error} onRetry={revalidate} />;
  }

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={title}
      markdown={buildTranscriptMarkdown(title, summary, data)}
      actions={
        <ActionPanel>
          <Action.Push
            title="Summarize with AI"
            icon={Icon.Stars}
            target={
              <SummarizeCall
                callId={callId}
                title={title}
                onApplied={(applied) => {
                  setSummary(applied);
                  onChange?.();
                }}
              />
            }
          />
          <Action.Push
            title="Generate Title & Summary…"
            icon={Icon.Stars}
            target={
              <GenerateCallMetadata
                callId={callId}
                title={title}
                onApplied={(applied) => {
                  setTitle(applied.title || fallbackTitle);
                  setSummary(applied.summary);
                  onChange?.();
                }}
              />
            }
          />
          <Action title="Copy AI Context" icon={Icon.Clipboard} onAction={() => copyAiContext(callId)} />
          <Action
            title="Export Transcript"
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
  const toast = await showToast({ style: Toast.Style.Animated, title: "Exporting transcript…" });
  try {
    await exportTranscripts(dir, callId);
    toast.style = Toast.Style.Success;
    toast.title = "Transcript Exported";
    toast.message = dir;
    toast.primaryAction = {
      title: "Open Folder",
      onAction: () => {
        open(dir);
      },
    };
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could Not Export Transcript";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}

function buildTranscriptMarkdown(title: string, summary: string, transcript: string | undefined): string {
  const heading = `# ${title}`;
  const summaryBlock = summary.trim() ? `\n\n${summary.trim()}` : "";
  const cleaned = transcript ? formatTranscript(transcript) : "";
  const body = cleaned ? `\n\n---\n\n${cleaned}` : "\n\n_No transcript text available._";
  return `${heading}${summaryBlock}${body}`;
}

/** Strip the CLI's ANSI color codes and put each utterance on its own line so markdown doesn't run them together. */
function formatTranscript(raw: string): string {
  return stripAnsi(raw)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n\n");
}

/**
 * Most-recent first. The CLI's `transcription search` returns matches in FTS-rank order, not by
 * time, so the view sorts them — within the returned page (`--limit`); a term with more matches than
 * the limit is still capped by the CLI's own ordering before this runs.
 */
function byTimeDesc(a: TranscriptMatch, b: TranscriptMatch): number {
  return matchTime(b) - matchTime(a);
}

function matchTime(match: TranscriptMatch): number {
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
