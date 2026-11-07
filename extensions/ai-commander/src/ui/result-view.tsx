import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  environment,
  Form,
  Icon,
  Keyboard,
  LaunchType,
  launchCommand,
  openExtensionPreferences,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useForm } from "@raycast/utils";
import { useMemo, useRef, useState } from "react";
import {
  buildMessages,
  estimateCost,
  modelName,
  recordUse,
  type ChatMessages,
  type RunResult,
} from "../commands/execute";
import { isTransient, RunFailure, toRunFailure } from "../commands/failure";
import type { RunInput } from "../commands/input";
import { resolveRun, type ResolvedRun } from "../commands/resolve";
import type { ModelRef, PromptDef } from "../core/types";
import { changeShare, diffSegments, escapeMarkdown, renderSegments, type DiffSegment } from "../prompts/diff";
import { renderDiffImage } from "../prompts/diff-image";
import { insertAfterSelection } from "../prompts/postprocess";
import { setDefaultModel, updatePrompt } from "../prompts/store";
import { buildRefineRequest } from "../prompts/system-frame";
import { PROVIDER_LABELS } from "../providers";
import { guarded, showError } from "./feedback";
import { ModelPicker } from "./model-picker";
import { useRunOnce } from "./use-run-once";
import { useRunStream, type RunOutcome, type RunRequest } from "./use-run-stream";

/** The view shows only the end of a long stream. Detail may not follow new text, and this bounds each update. */
const STREAM_TAIL_CHARS = 4_000;

/** How much of the current result the message form shows as a reminder. */
const COMPOSE_PREVIEW_CHARS = 600;

/** Above this share of new text nearly everything is green, and the plain result is easier to read. */
const HEAVY_REWRITE_SHARE = 0.7;

/** `auto` picks changes or the plain result by how much was rewritten. Each new version starts there. */
type ViewMode = "auto" | "changes" | "result" | "original";

/** One version of the result. The history lives only as long as this view is open. */
interface Turn {
  id: number;
  /** The version this one builds on, which is what makes branching from an earlier version work. */
  parentId?: number;
  /** Set for follow-up requests, which become context for later versions. */
  instruction?: string;
  messages?: ChatMessages;
  run?: ResolvedRun;
  status: "streaming" | "done" | "canceled" | "failed";
  text?: string;
  result?: RunResult;
  failure?: RunFailure;
}

function streamMarkdown(text: string): string {
  if (text.length <= STREAM_TAIL_CHARS) return escapeMarkdown(text);
  return `…\n\n${escapeMarkdown(text.slice(-STREAM_TAIL_CHARS))}`;
}

function waitingMarkdown(run: ResolvedRun | undefined): string {
  return run ? `_Generating with ${escapeMarkdown(modelName(run))}…_` : "_Preparing…_";
}

function failureMarkdown(failure: RunFailure): string {
  return `## ${escapeMarkdown(failure.title)}\n\n${escapeMarkdown(failure.message)}`;
}

function formatTokens(count: number): string {
  return count.toLocaleString("en-US");
}

/** Green highlights where possible, the Markdown diff for long results, and plain text if neither works out. */
function changesMarkdown(segments: readonly DiffSegment[], text: string): string {
  try {
    return renderDiffImage(segments, { appearance: environment.appearance }) ?? renderSegments(segments);
  } catch {
    return escapeMarkdown(text);
  }
}

function ComposeForm({ current, onSend }: { current: string; onSend: (message: string) => void }) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<{ message: string }>({
    validation: { message: (value) => (value?.trim() ? undefined : "Required") },
    onSubmit: ({ message }) => {
      pop();
      onSend(message.trim());
    },
  });
  const preview = current.length > COMPOSE_PREVIEW_CHARS ? `${current.slice(0, COMPOSE_PREVIEW_CHARS)}…` : current;

  return (
    <Form
      navigationTitle="Ask for Changes"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send" icon={Icon.ArrowUpCircle} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Current Result" text={preview} />
      <Form.TextArea {...itemProps.message} title="Message" placeholder="Make it shorter and friendlier" />
    </Form>
  );
}

interface TurnMetadataProps {
  promptName: string;
  turn: Turn;
  position: number;
  total: number;
  notices: string[];
  /** Share of new text, if this version can be compared with the selection. */
  changed?: number;
  /** Shortcut hints, shown only while the action exists. */
  hints: { label: string; keys: string }[];
}

function TurnMetadata({ promptName, turn, position, total, notices, changed, hints }: TurnMetadataProps) {
  const { run, result } = turn;
  const usage = result?.usage;
  const cost = run ? estimateCost(run, usage) : undefined;
  return (
    <Detail.Metadata>
      <Detail.Metadata.Label title="Prompt" text={promptName} />
      {run && <Detail.Metadata.Label title="Model" text={modelName(run)} />}
      {run && <Detail.Metadata.Label title="Provider" text={PROVIDER_LABELS[run.ref.provider]} />}
      {result && <Detail.Metadata.Label title="Duration" text={`${(result.durationMs / 1000).toFixed(1)} s`} />}
      {usage && (
        <Detail.Metadata.Label
          title="Tokens"
          text={`${formatTokens(usage.input)} in, ${formatTokens(usage.output)} out`}
        />
      )}
      {cost !== undefined && <Detail.Metadata.Label title="Estimated Cost" text={`$${cost.toFixed(4)}`} />}
      {changed !== undefined && <Detail.Metadata.Label title="Changed Text" text={`${Math.round(changed * 100)}%`} />}
      {notices.map((notice) => (
        <Detail.Metadata.Label key={notice} title="Note" text={notice} />
      ))}
      {total > 1 && <Detail.Metadata.Label title="Version" text={`${position} of ${total}`} />}
      {turn.instruction && <Detail.Metadata.Label title="Request" text={turn.instruction} />}
      {hints.length > 0 && <Detail.Metadata.Separator />}
      {hints.map((hint) => (
        <Detail.Metadata.Label key={hint.label} title={hint.label} text={hint.keys} />
      ))}
    </Detail.Metadata>
  );
}

interface ResultViewProps {
  prompt: PromptDef;
  input: RunInput;
  args: Record<string, string>;
  /** Only for a pushed view. Raycast's guidelines keep the title of a command's root view unchanged. */
  navigationTitle?: string;
}

/**
 * Streams the result and lets the user keep working on it. Text on the left and data on the right need a Detail view,
 * and Raycast offers no text field inside one (only its own AI window has that), so messages use a small form.
 */
export function ResultView({ prompt, input, args, navigationTitle }: ResultViewProps) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [request, setRequest] = useState<RunRequest>();
  const [selectedId, setSelectedId] = useState<number>();
  const [modelOverride, setModelOverride] = useState<ModelRef>();
  const [view, setView] = useState<ViewMode>("auto");
  const nextId = useRef(1);

  function settle(id: number, outcome: RunOutcome) {
    setTurns((all) =>
      all.map((turn) => {
        if (turn.id !== id) return turn;
        if (outcome.status === "done") return { ...turn, status: "done", text: outcome.text, result: outcome.result };
        if (outcome.status === "failed") return { ...turn, status: "failed", failure: outcome.failure };
        return { ...turn, status: "canceled", text: outcome.text };
      }),
    );
  }

  const { liveText, cancel } = useRunStream(request, input.selection, settle);

  async function begin(
    messages: ChatMessages,
    model: ModelRef | undefined,
    origin: Pick<Turn, "instruction" | "parentId"> = {},
  ) {
    const id = nextId.current++;
    const base = { id, messages, ...origin };
    setSelectedId(id);
    setView("auto");
    try {
      const run = await resolveRun(prompt, model);
      // Starting a request replaces a running one, for example after a model change, and that one never reports back.
      const stopRunning = (turn: Turn): Turn => (turn.status === "streaming" ? { ...turn, status: "canceled" } : turn);
      setTurns((all) => [...all.map(stopRunning), { ...base, run, status: "streaming" }]);
      setRequest({ id, run, messages });
    } catch (error) {
      setTurns((all) => [...all, { ...base, status: "failed", failure: toRunFailure(error) }]);
    }
  }

  /** Builds the first request from the captured input. Also the retry when that failed, on a missing snippet say. */
  async function prepare(model: ModelRef | undefined) {
    try {
      const messages = await buildMessages(prompt, input, args);
      recordUse(prompt.id);
      await begin(messages, model);
    } catch (error) {
      const id = nextId.current++;
      setSelectedId(id);
      setTurns((all) => [...all, { id, status: "failed", failure: toRunFailure(error) }]);
    }
  }

  useRunOnce(() => void prepare(undefined));

  const busy = turns.some((turn) => turn.status === "streaming");
  // The original request. A failed preparation leaves turns without one, so it is not always the first turn's.
  const firstMessages = turns.find((turn) => turn.messages)?.messages;
  const latest = turns[turns.length - 1];
  const selected = turns.find((turn) => turn.id === selectedId) ?? latest;
  const position = selected ? turns.indexOf(selected) + 1 : 0;
  // A follow-up continues from the version on screen, or from the newest finished one if that one failed.
  const baseTurn = selected?.status === "done" ? selected : turns.findLast((turn) => turn.status === "done");
  const selectedText = selected?.status === "done" ? selected.text : undefined;
  const canShowChanges = prompt.highlightChanges && input.selection !== undefined;

  const segments = useMemo(
    () =>
      canShowChanges && selectedText !== undefined ? diffSegments(input.selection ?? "", selectedText) : undefined,
    [canShowChanges, selectedText, input.selection],
  );
  const changed = segments ? changeShare(segments) : undefined;

  const isHeavyRewrite = changed !== undefined && changed > HEAVY_REWRITE_SHARE;
  const autoView = segments && !isHeavyRewrite ? "changes" : "result";
  const displayed = view === "auto" ? autoView : view;

  const selectedMarkdown = useMemo(() => {
    if (!selected) return waitingMarkdown(undefined);
    if (selected.failure) return failureMarkdown(selected.failure);
    if (selected.status === "streaming") {
      return liveText === "" ? waitingMarkdown(selected.run) : streamMarkdown(liveText);
    }
    if (selected.status === "canceled") return `## Canceled\n\n${streamMarkdown(selected.text ?? "")}`;
    if (selected.text === undefined) return "";
    if (displayed === "original") return escapeMarkdown(input.selection ?? "");
    if (displayed === "changes" && segments) return changesMarkdown(segments, selected.text);
    return escapeMarkdown(selected.text);
  }, [selected, liveText, displayed, segments, input.selection]);

  /** Only the versions this one really builds on: a branch must not inherit requests of the path it left. */
  function requestsLeadingTo(turn: Turn): string[] {
    const chain: string[] = [];
    for (let current: Turn | undefined = turn; current;) {
      if (current.instruction) chain.unshift(current.instruction);
      const parentId: number | undefined = current.parentId;
      current = turns.find((candidate) => candidate.id === parentId);
    }
    return chain;
  }

  function send(instruction: string) {
    if (!firstMessages || baseTurn?.text === undefined) return;
    const messages = buildRefineRequest({
      original: firstMessages.user,
      currentResult: baseTurn.text,
      instruction,
      earlierInstructions: requestsLeadingTo(baseTurn),
    });
    void begin(messages, modelOverride, { instruction, parentId: baseTurn.id });
  }

  /** Repeats the version on screen, not the newest one. Without any request yet, it prepares the first one again. */
  function rerun(model: ModelRef | undefined) {
    const source = selected?.messages ? selected : latest;
    if (!source?.messages) {
      void prepare(model);
      return;
    }
    void begin(source.messages, model, { instruction: source.instruction, parentId: source.parentId });
  }

  function changeModel(ref: ModelRef) {
    setModelOverride(ref);
    rerun(ref);
  }

  async function saveModel(ref: ModelRef) {
    try {
      await updatePrompt(prompt.id, { model: ref });
    } catch (error) {
      await showError("Cannot Save Model", error);
    }
    changeModel(ref);
  }

  async function chooseDefaultModel(ref: ModelRef) {
    try {
      await setDefaultModel({ ref, reasoning: "default" });
      rerun(undefined);
    } catch (error) {
      await showError("Cannot Save Default Model", error);
    }
  }

  async function copy(text: string) {
    // Action.CopyToClipboard would close the window, but the user may want to keep going.
    await Clipboard.copy(text, { concealed: true });
    await showToast({ style: Toast.Style.Success, title: "Result Copied" });
  }

  function showVersion(offset: number) {
    const next = turns[position - 1 + offset];
    if (next) setSelectedId(next.id);
  }

  function pasteAction(result: string) {
    if (input.selection === undefined) {
      return <Action.Paste title="Paste Result" icon={Icon.TextCursor} content={result} />;
    }
    if (prompt.output !== "insertAfter") {
      return <Action.Paste title="Replace Selection" icon={Icon.Replace} content={result} />;
    }
    return (
      <Action.Paste
        title="Insert After Selection"
        icon={Icon.PlusCircle}
        content={insertAfterSelection(input.selection, result)}
      />
    );
  }

  function actions() {
    if (!selected) return undefined;
    const { failure } = selected;
    const retryFirst = failure !== undefined && isTransient(failure);
    const copyAction = selectedText !== undefined && (
      <Action
        title="Copy Result"
        icon={Icon.Clipboard}
        shortcut={Keyboard.Shortcut.Common.Copy}
        onAction={() => copy(selectedText)}
      />
    );
    const paste = selectedText !== undefined && pasteAction(selectedText);
    const retryAction = !busy && (
      <Action
        title={failure ? "Try Again" : "Regenerate"}
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={() => rerun(modelOverride)}
      />
    );

    return (
      <ActionPanel>
        {/* Enter stays harmless during a paid run, so the first action does nothing. */}
        {busy && <Action title="Generating…" icon={Icon.Clock} onAction={() => undefined} />}
        {retryFirst && retryAction}
        {/* Insert actions only exist for a finished result, so a partial answer cannot be pasted. */}
        {prompt.output === "copy" ? copyAction : paste}
        {prompt.output === "copy" ? paste : copyAction}
        {segments && displayed !== "original" && (
          <Action
            title={displayed === "changes" ? "Show Plain Result" : "Show Changes"}
            icon={displayed === "changes" ? Icon.Eye : Icon.Highlight}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            onAction={() => setView(displayed === "changes" ? "result" : "changes")}
          />
        )}
        {selectedText !== undefined && input.selection !== undefined && (
          <Action
            title={displayed === "original" ? "Show Result" : "Show Original"}
            icon={displayed === "original" ? Icon.Document : Icon.TextSelection}
            shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
            onAction={() => setView(displayed === "original" ? "auto" : "original")}
          />
        )}
        {!busy && baseTurn?.text !== undefined && (
          <Action.Push
            title="Ask for Changes"
            icon={Icon.Message}
            shortcut={Keyboard.Shortcut.Common.New}
            target={<ComposeForm current={baseTurn.text} onSend={send} />}
          />
        )}
        {busy && <Action title="Cancel" icon={Icon.XMarkCircle} onAction={cancel} />}
        {position > 1 && !busy && (
          <Action
            title="Previous Version"
            icon={Icon.ArrowLeft}
            shortcut={{ modifiers: ["cmd"], key: "[" }}
            onAction={() => showVersion(-1)}
          />
        )}
        {position < turns.length && !busy && (
          <Action
            title="Next Version"
            icon={Icon.ArrowRight}
            shortcut={{ modifiers: ["cmd"], key: "]" }}
            onAction={() => showVersion(1)}
          />
        )}
        {(failure?.kind === "auth" || failure?.kind === "missing-key") && (
          <Action title="Open Extension Preferences" icon={Icon.Key} onAction={openExtensionPreferences} />
        )}
        {failure?.kind === "no-default-model" && (
          <Action.Push
            title="Choose Default Model"
            icon={Icon.CheckCircle}
            target={<ModelPicker title="Choose Default Model" onPick={chooseDefaultModel} />}
          />
        )}
        {failure?.kind === "no-strict-endpoint" && (
          <Action
            title="Open Models & Providers"
            icon={Icon.Gear}
            onAction={guarded("Cannot Open Models & Providers", () =>
              launchCommand({ name: "manage-models", type: LaunchType.UserInitiated }),
            )}
          />
        )}
        <Action.Push
          title="Change Model"
          icon={Icon.Switch}
          shortcut={{ modifiers: ["cmd"], key: "m" }}
          target={
            <ModelPicker
              title="Change Model"
              onPick={changeModel}
              onPickAndSave={saveModel}
              saveTitle="Use and Save to Prompt"
            />
          }
        />
        {!retryFirst && retryAction}
      </ActionPanel>
    );
  }

  const hints = [
    ...(!busy && baseTurn ? [{ label: "Ask for Changes", keys: "⌘N" }] : []),
    ...(segments && displayed === "result" ? [{ label: "Show Changes", keys: "⌘D" }] : []),
    ...(turns.length > 1 && !busy ? [{ label: "Switch Version", keys: "⌘[  ⌘]" }] : []),
  ];

  return (
    <Detail
      navigationTitle={navigationTitle}
      isLoading={busy || turns.length === 0}
      markdown={selectedMarkdown}
      metadata={
        selected ? (
          <TurnMetadata
            promptName={prompt.name}
            turn={selected}
            position={position}
            total={turns.length}
            notices={input.notices}
            changed={changed}
            hints={hints}
          />
        ) : undefined
      }
      actions={actions()}
    />
  );
}
