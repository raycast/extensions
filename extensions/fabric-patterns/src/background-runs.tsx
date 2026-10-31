import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import {
  type BgStatus,
  canCopyError,
  listRuns,
  LOST_NOTE,
  type RunRecord,
  STATUS_LABEL,
  type StopOutcome,
  stopRun,
} from "../lib/background";
import type { App } from "../lib/input";
import { readText } from "../lib/loaders";
import { tokensText } from "../lib/metadata";
import { classifyFailure, stateFor } from "../lib/states";
import { RUNS_DIR } from "./background";
import { deliverAnswer, shownPath, shownText } from "./deliver";
import { STOPPING } from "./result";
import { prefs } from "./storage";
import { raycastReaders } from "./input-source";

const STATUS: Record<BgStatus, { icon: Icon; color: Color }> = {
  running: { icon: Icon.CircleProgress50, color: Color.Blue },
  done: { icon: Icon.CheckCircle, color: Color.Green },
  failed: { icon: Icon.XMarkCircle, color: Color.Red },
  stopped: { icon: Icon.StopFilled, color: Color.SecondaryText },
};

/** The detail pane's markdown. A lost run never exited, so it has no code and no failure to classify. */
function detailBody(r: RunRecord, answer: string | undefined): string {
  if (r.status === "done") return answer ?? "_The saved answer file is gone._";
  if (r.status === "running") return "_Still running. A notification says when it's done._";
  if (r.status === "stopped") return "## Stopped\n\nYou stopped this run. Nothing was saved.";
  const printed = shownText(r.stderr.trim());
  if (r.lost) return `## Lost\n\n${LOST_NOTE}${printed ? `\n\n\`\`\`\n${printed}\n\`\`\`` : ""}`;
  const st = stateFor(classifyFailure(r.stderr), { fabricPath: prefs().fabricPath });
  return `## ${st.title} (exit ${r.code})\n\n${shownText(st.description ?? "")}\n\n\`\`\`\n${printed || "No error output."}\n\`\`\``;
}

/** What the list shows per run; when it is unchanged a poll skips the re-render. */
const signature = (runs: RunRecord[]) => runs.map((r) => `${r.id}:${r.status}:${r.output ?? ""}`).join("|");

function when(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const STOP_TITLE: Record<StopOutcome, string> = {
  stopped: "Stopped",
  stopping: "Still stopping. The list shows Stopped once it has ended",
  finished: "It had already finished",
  lost: "It had already ended without reporting back",
  refused: "Couldn't stop it safely",
};

/** stopRun can wait a while for the group to end, so a spinner shows meanwhile; its outcome replaces it. */
export async function stopFeedback(pending: Promise<StopOutcome>): Promise<StopOutcome> {
  await showToast(STOPPING);
  // A throw can't leave the spinner up: it reads as refused, like any Stop that couldn't be checked.
  const outcome = await pending.catch((): StopOutcome => "refused");
  await showToast({
    // A lost run isn't a success: it never reported how it ended.
    style: outcome === "refused" || outcome === "lost" ? Toast.Style.Failure : Toast.Style.Success,
    title: STOP_TITLE[outcome],
  });
  return outcome;
}

export default function Command() {
  const [runs, setRuns] = useState<RunRecord[]>();
  const [target, setTarget] = useState<App>();
  const seen = useRef<string | undefined>(undefined);
  // A finished run's answer file never changes, so it is read once per path.
  const answers = useRef(new Map<string, string | undefined>());
  const answerOf = (r: RunRecord) => {
    if (!r.output) return undefined;
    if (!answers.current.has(r.output)) answers.current.set(r.output, readText(r.output));
    return answers.current.get(r.output);
  };
  const refresh = () => {
    const next = listRuns(RUNS_DIR);
    const sig = signature(next);
    if (sig === seen.current) return;
    seen.current = sig;
    setRuns(next);
  };

  useEffect(() => {
    // The app behind Raycast at launch is where Paste goes.
    raycastReaders
      .frontmostApp()
      .then(setTarget)
      .catch(() => undefined);
    refresh();
    const t = setInterval(refresh, 2000);
    return () => clearInterval(t);
  }, []);

  // Stopping throws away the partial answer, so it confirms first (ISC-37).
  async function confirmStop(r: RunRecord) {
    const ok = await confirmAlert({
      title: "Stop this run?",
      message: "The partial answer isn't saved.",
      primaryAction: { title: "Stop", style: Alert.ActionStyle.Destructive },
    });
    if (ok) await stop(r);
  }

  async function stop(r: RunRecord) {
    await stopFeedback(stopRun(RUNS_DIR, r.id));
    refresh();
  }

  return (
    <List isLoading={!runs} isShowingDetail={!!runs?.length} searchBarPlaceholder="Search background runs…">
      <List.EmptyView
        icon={Icon.Clock}
        title="No background runs"
        description="Web pages, YouTube links and audio or video files run here, so you can close Raycast while they work."
      />
      {runs?.map((r) => {
        const answer = r.status === "done" ? answerOf(r) : undefined;
        return (
          <List.Item
            key={r.id}
            title={r.pattern}
            // No subtitle: beside the detail panel the row is narrow, and the input cut the name to "youtub…".
            // The detail panel's Input row carries it.
            icon={{ source: STATUS[r.status].icon, tintColor: STATUS[r.status].color }}
            accessories={[{ text: when(r.startedAt) }]}
            detail={
              <List.Item.Detail
                markdown={detailBody(r, answer)}
                metadata={
                  <List.Item.Detail.Metadata>
                    {/* A tag, not a plain label: Raycast clipped the short "Stopped" text to "Sto…ed". */}
                    <List.Item.Detail.Metadata.TagList title="Status">
                      <List.Item.Detail.Metadata.TagList.Item
                        text={STATUS_LABEL[r.status]}
                        color={STATUS[r.status].color}
                      />
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.Label title="Input" text={r.inputLabel} />
                    <List.Item.Detail.Metadata.Label title="Started" text={when(r.startedAt)} />
                    {r.output && <List.Item.Detail.Metadata.Label title="Saved to" text={shownPath(r.output)} />}
                    {r.tokens && <List.Item.Detail.Metadata.Label title="Tokens" text={tokensText(r.tokens)} />}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                {r.status === "running" && (
                  <Action
                    title="Stop Run"
                    icon={Icon.Stop}
                    style={Action.Style.Destructive}
                    onAction={() => confirmStop(r)}
                  />
                )}
                {answer && (
                  <>
                    <Action.CopyToClipboard title="Copy to Clipboard" content={answer} />
                    <Action
                      title="Paste into Current App"
                      icon={Icon.Clipboard}
                      onAction={() => deliverAnswer(answer, "paste", { target })}
                    />
                  </>
                )}
                {/* An answer is for reading, so it opens in the .md app (a previewer), not Open in Editor's text editor. */}
                {r.output && (
                  <Action.Open title="Open Answer File" target={r.output} shortcut={Keyboard.Shortcut.Common.Open} />
                )}
                {r.output && <Action.ShowInFinder path={r.output} />}
                {canCopyError(r) && <Action.CopyToClipboard title="Copy Error Output" content={r.stderr} />}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
