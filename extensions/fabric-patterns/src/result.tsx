import { Action, ActionPanel, Detail, Icon, Keyboard, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { buildArgv, effectiveModel, type RunSpec } from "../lib/argv";
import type { App } from "../lib/input";
import { tokensText } from "../lib/metadata";
import { inputSubject, OUTPUT_LABEL, type OutputMode, outputFileName, runLabel } from "../lib/output";
import {
  primaryAction,
  resultMarkdown,
  shellCommand,
  statusLabel,
  statusOf,
  stoppedMessage,
  unmountNotice,
} from "../lib/result";
import type { GroupSignaller } from "../lib/proc";
import { type AbortOutcome, type RunResult, runFabric, stdinFor } from "../lib/runner";
import { classifyFailure, stateFor } from "../lib/states";
import { modelLabel, parseStepLine, progressText, stepsText } from "../lib/workflow";
import { deliverAnswer, errorText, notify, saveAnswer, shownPath, shownText } from "./deliver";
import { PinModel } from "./pin-model";
import { SaveAs } from "./save-as";
import { stateAction } from "./states";

export interface ResultProps {
  fabricPath: string;
  spec: RunSpec;
  /** e.g. "Selected text (TextEdit)". */
  inputLabel: string;
  /** Where the answer goes when the run finishes cleanly. Ignored for a preview. */
  output: OutputMode;
  /** The app that was in front when the run started; paste goes only there. */
  target?: App;
  /** Test seam for the kernel's answer to Stop (an EPERM can't be produced on demand). */
  signalGroup?: GroupSignaller;
  /** Test seam for the macOS notification an unmount mid-run sends. */
  notice?: (text: string) => unknown;
}

/** Both Stop actions (here and Show Background Runs) spin with this while the run ends. */
export const STOPPING: Toast.Options = { style: Toast.Style.Animated, title: "Stopping…" };

/**
 * What Stop Run says. "Stopped" waits for the run's done, once fabric and everything it started
 * has exited; a run that already ended gets no toast, since nothing would replace it.
 */
export function stopToast(outcome: AbortOutcome): Toast.Options | undefined {
  if (outcome === "stopping") return STOPPING;
  if (outcome === "denied")
    return {
      style: Toast.Style.Failure,
      title: "Couldn't stop it",
      message: "macOS refused the signal (not permitted). The run goes on.",
    };
  return undefined;
}

/** The model the run sends, with its vendor when one goes with it; a chain step's own model wins over -m and --config (probed on fabric 1.4.527, dry run). */
export function modelText(spec: RunSpec): string {
  const { model, vendor } = effectiveModel(spec);
  const run = model ? modelLabel(model, vendor) : "fabric chooses";
  const steps = spec.workflow?.steps ?? [];
  const each = steps.map((s) => (s.model ? modelLabel(s.model, s.vendor) : run));
  if (new Set(each).size <= 1) return each[0] ?? run;
  return steps.map((s, i) => `${s.pattern}: ${each[i]}`).join(" · ");
}

/** fabric's dry run of a chain prints the last step's request, with each earlier one inside the next one's User. */
const CHAIN_PREVIEW_NOTE =
  "_fabric previews a chain from its last step back: each earlier step's prompt sits under the next step's User._";

/** Shown when delivery failed; the failure Toast says why. */
const NOT_DELIVERED = "Not delivered (see the error)";

export function ResultView({
  fabricPath,
  spec,
  inputLabel,
  output,
  target,
  signalGroup,
  notice = notify,
}: ResultProps) {
  const preview = !!spec.dryRun;
  const name = runLabel(spec);
  const chainText = spec.workflow ? `${name}: ${stepsText(spec.workflow.steps)}` : name;
  const { push } = useNavigation();
  // A name fabric lists but argv refuses (a context called "work notes") shows its reason, not a crash.
  const built = useMemo(() => {
    try {
      return { argv: buildArgv({ ...spec, stream: !preview, showMetadata: true }) };
    } catch (e) {
      return { error: errorText(e) };
    }
  }, []);
  const argv = built.argv ?? [];
  const [text, setText] = useState("");
  const [result, setResult] = useState<RunResult>();
  const [elapsed, setElapsed] = useState(0);
  const [abort, setAbort] = useState<() => AbortOutcome>(() => () => "over");
  /** What delivery did, e.g. "Copied (TextEdit wasn't in front)"; shown in place of the plan once known. */
  const [delivered, setDelivered] = useState<string>();
  /** A chain's current step, from fabric's `[step 2/3 summarize] …` stderr lines. */
  const [step, setStep] = useState<string>();
  const where = { target, pattern: name, subject: inputSubject(spec.input) };

  useEffect(() => {
    if (built.error) return;
    let ignore = false;
    /** Set once fabric has ended or Stop was pressed: an unmount after either loses nothing. */
    let ended = false;
    const started = Date.now();
    const tick = setInterval(() => setElapsed(Math.round((Date.now() - started) / 1000)), 1000);
    const h = runFabric(fabricPath, argv, {
      stdin: stdinFor(spec.input),
      onText: (t) => !ignore && setText((prev) => prev + t),
      onStderr: spec.workflow
        ? (line) => {
            const p = parseStepLine(line);
            if (p && !ignore) setStep(progressText(p));
          }
        : undefined,
      signalGroup,
    });
    setAbort(() => () => {
      ended = true;
      return h.abort();
    });
    h.done.then(async (r) => {
      ended = true;
      clearInterval(tick);
      if (ignore) return;
      setElapsed(Math.round((Date.now() - started) / 1000));
      setText(r.stdout);
      setResult(r);
      const status = statusOf(r);
      if (status === "done" && !preview && r.stdout.trim()) {
        const did = await deliverAnswer(r.stdout, output, where);
        if (!ignore) setDelivered(did ?? NOT_DELIVERED);
      } else if (status === "stopped") {
        await showToast({ style: Toast.Style.Success, title: "Stopped", message: stoppedMessage(r.stdout) });
      } else if (status === "failed") {
        await showToast({
          style: Toast.Style.Failure,
          title: stateFor(classifyFailure(r.stderr, r.error), { fabricPath }).title,
          // A chain prints step progress before it fails; the error is the first line that isn't one.
          message: shownText(
            r.stderr
              .trim()
              .split("\n")
              .find((l) => l.trim() && !parseStepLine(l)) ?? "",
          ),
        });
      }
    });
    return () => {
      ignore = true;
      clearInterval(tick);
      h.abort();
      // Raycast unmounted the view mid-run (closed, or popped to root while hidden): say so, or it vanishes.
      if (!ended && !preview) void notice(unmountNotice(name));
    };
  }, []);

  if (built.error)
    return (
      <Detail
        navigationTitle={name}
        markdown={`## Can't run this\n\n${built.error}\n\nNames passed to fabric must be letters, digits, \`_ . -\` only. Rename it, then try again.`}
      />
    );

  const status = statusOf(result);
  const failure =
    status === "failed" && result ? stateFor(classifyFailure(result.stderr, result.error), { fabricPath }) : undefined;
  const primary = primaryAction(status, text);
  const stop = (
    <Action
      title="Stop Run"
      icon={Icon.Stop}
      onAction={() => {
        const toast = stopToast(abort());
        if (toast) showToast(toast);
      }}
    />
  );
  const finished = primary === "copy" && (
    <>
      <Action.CopyToClipboard title="Copy to Clipboard" content={text} />
      <Action
        title="Paste into Current App"
        icon={Icon.Clipboard}
        onAction={async () => setDelivered((await deliverAnswer(text, "paste", where)) ?? NOT_DELIVERED)}
      />
      <Action
        title="Save to File"
        icon={Icon.SaveDocument}
        shortcut={Keyboard.Shortcut.Common.Save}
        onAction={async () => {
          try {
            const path = saveAnswer(text, name, where.subject);
            const shown = shownPath(path);
            setDelivered(`Saved: ${shown}`);
            await showToast({ style: Toast.Style.Success, title: "Saved", message: shown });
          } catch (e) {
            await showToast({ style: Toast.Style.Failure, title: "Couldn't save", message: errorText(e) });
          }
        }}
      />
      <Action
        title="Save as…"
        icon={Icon.SaveDocument}
        // ⇧⌘S, macOS's Save As keys, spelled out. The lint rule's table calls these Common.Duplicate, but
        // Raycast binds Common.Duplicate to ⌘D (manual test, 2026-10-19), so the rule is out of date here.
        // eslint-disable-next-line @raycast/prefer-common-shortcut
        shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
        onAction={() =>
          push(
            <SaveAs
              text={text}
              defaultName={outputFileName(name, where.subject, new Date())}
              onSaved={(path) => setDelivered(`Saved: ${shownPath(path)}`)}
            />,
          )
        }
      />
    </>
  );

  const title = preview ? "Preview Prompt" : statusLabel(status, elapsed);
  const running = status === "running" && step;
  return (
    <Detail
      navigationTitle={[preview ? chainText : name, running, title].filter(Boolean).join(" · ")}
      isLoading={status === "running"}
      // A failure quotes fabric's stderr, which can name a home path.
      markdown={(status === "failed" ? shownText : String)(
        resultMarkdown(
          status,
          text,
          result,
          failure,
          running ? `${step} running…` : undefined,
          preview && spec.workflow ? CHAIN_PREVIEW_NOTE : undefined,
        ),
      )}
      metadata={
        <Detail.Metadata>
          {spec.workflow ? (
            <Detail.Metadata.Label title="Chain" text={chainText} />
          ) : (
            <Detail.Metadata.Label title="Pattern" text={spec.pattern ?? "none"} />
          )}
          <Detail.Metadata.Label title="Input" text={inputLabel} />
          <Detail.Metadata.Label title="Strategy" text={spec.strategy ?? "none"} />
          {spec.context && <Detail.Metadata.Label title="Context" text={spec.context} />}
          {spec.session && <Detail.Metadata.Label title="Session" text={spec.session} />}
          <Detail.Metadata.Label title="Model" text={modelText(spec)} />
          {spec.thinking && <Detail.Metadata.Label title="Thinking" text={spec.thinking} />}
          {/* A preview's counts are made up (probed on fabric 1.4.518): never shown, even if a line arrived. */}
          {/* fabric streams only a chain's last step, so its counts are that step's. */}
          {!preview && result?.tokens && (
            <Detail.Metadata.Label
              title={spec.workflow ? "Tokens (last step)" : "Tokens"}
              text={tokensText(result.tokens)}
            />
          )}
          {delivered ? (
            <Detail.Metadata.Label title="Delivered" text={delivered} />
          ) : (
            <Detail.Metadata.Label
              title="When a Run Finishes"
              text={preview ? "Nothing (no model is called)" : OUTPUT_LABEL[output]}
            />
          )}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Status" text={title} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {primary === "stop" ? stop : finished}
          {failure && failure.action !== "copy-command" && stateAction(failure, { fabricPath })}
          {spec.pattern && (
            <Action
              title="Pin Model…"
              icon={Icon.ComputerChip}
              shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
              onAction={() => push(<PinModel pattern={spec.pattern!} />)}
            />
          )}
          <Action.CopyToClipboard
            title="Copy Fabric Command"
            content={shellCommand(fabricPath, argv)}
            // ⇧⌘C. Not ⇧⌘,: Raycast keeps that for opening the command's settings.
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
        </ActionPanel>
      }
    />
  );
}
