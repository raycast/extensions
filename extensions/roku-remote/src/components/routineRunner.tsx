import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { executeRoutine } from "../lib/automation";
import type { Routine, RoutineProgress, RoutineRunResult, RoutineStep } from "../lib/routines";
import { describeRokuError } from "../lib/roku";

export const KEY_LABELS: Record<string, string> = {
  Up: "Move Up",
  Down: "Move Down",
  Left: "Move Left",
  Right: "Move Right",
  Select: "Select / OK",
  Home: "Go Home",
  Back: "Go Back",
  Info: "Open Options",
  Play: "Play / Pause",
  Rev: "Rewind",
  Fwd: "Fast Forward",
  InstantReplay: "Instant Replay",
  VolumeUp: "Raise Volume",
  VolumeDown: "Lower Volume",
  VolumeMute: "Mute / Unmute",
  PowerOff: "Turn TV Off",
  ChannelUp: "Next Channel",
  ChannelDown: "Previous Channel",
  FindRemote: "Find Remote",
  InputTuner: "Switch to Live TV",
  InputHDMI1: "Switch to HDMI 1",
  InputHDMI2: "Switch to HDMI 2",
  InputHDMI3: "Switch to HDMI 3",
  InputHDMI4: "Switch to HDMI 4",
  InputAV1: "Switch to AV",
  Backspace: "Delete Character",
  Enter: "Enter",
};

export function stepLabel(step: RoutineStep): string {
  switch (step.type) {
    case "wake":
      return "Turn TV On";
    case "launch":
      return `Open ${step.appName ?? "App or Input"}`;
    case "key":
      return `${KEY_LABELS[step.key] ?? step.key}${(step.count ?? 1) > 1 ? ` · ${step.count} times` : ""}`;
    case "wait":
      return `Wait ${step.seconds} ${step.seconds === 1 ? "second" : "seconds"}`;
    case "restore":
      return "Restore Previous App or Input";
  }
}

export function stepIcon(step: RoutineStep): Icon {
  switch (step.type) {
    case "wake":
      return Icon.Power;
    case "launch":
      return step.appId.startsWith("tvinput.") ? Icon.Desktop : Icon.AppWindow;
    case "key":
      return Icon.Keyboard;
    case "wait":
      return Icon.Clock;
    case "restore":
      return Icon.ArrowCounterClockwise;
  }
}

export function RoutineRunner({ routine: initialRoutine, deviceName }: { routine: Routine; deviceName?: string }) {
  const [routine] = useState(() => initialRoutine);
  const [progress, setProgress] = useState<RoutineProgress>();
  const [result, setResult] = useState<RoutineRunResult>();
  const [isRunning, setIsRunning] = useState(false);
  const controller = useRef<AbortController | undefined>(undefined);
  const mounted = useRef(false);
  const runId = useRef(0);
  const completedCount = useRef(0);

  const run = useCallback(async () => {
    if (controller.current) return;
    const current = ++runId.current;
    const cancellation = new AbortController();
    controller.current = cancellation;
    setIsRunning(true);
    setProgress(undefined);
    setResult(undefined);
    completedCount.current = 0;
    try {
      const outcome = await executeRoutine(routine, {
        signal: cancellation.signal,
        onProgress(next: RoutineProgress) {
          if (current !== runId.current) return;
          if (next.status === "completed") completedCount.current = next.stepNumber;
          if (mounted.current && current === runId.current) setProgress(next);
        },
      });
      if (mounted.current && current === runId.current) setResult(outcome);
    } catch (cause) {
      if (mounted.current && current === runId.current) {
        setResult({
          status: cancellation.signal.aborted ? "cancelled" : "failed",
          completedSteps: completedCount.current,
          totalSteps: routine.steps.length,
          error: describeRokuError(cause),
        });
      }
    } finally {
      if (current === runId.current) {
        controller.current = undefined;
        if (mounted.current) setIsRunning(false);
      }
    }
  }, [routine]);

  useEffect(() => {
    mounted.current = true;
    void run();
    return () => {
      mounted.current = false;
      controller.current?.abort();
    };
  }, [run]);

  const completed =
    result?.completedSteps ?? (progress ? progress.stepIndex + (progress.status === "completed" ? 1 : 0) : 0);
  const actions = (
    <ActionPanel>
      {isRunning ? (
        <Action
          title="Cancel Routine"
          icon={Icon.Stop}
          style={Action.Style.Destructive}
          onAction={() => controller.current?.abort()}
        />
      ) : (
        <Action title="Run Again" icon={Icon.Play} onAction={run} />
      )}
    </ActionPanel>
  );
  const summary = isRunning
    ? "Running routine…"
    : result?.status === "completed"
      ? "Routine completed"
      : result?.status === "cancelled"
        ? "Routine cancelled"
        : result?.status === "failed"
          ? "Routine stopped"
          : "Starting routine…";

  return (
    <List
      isLoading={isRunning}
      navigationTitle={`${routine.name} · ${deviceName ?? "Roku TV"}`}
      isShowingDetail
      searchBarPlaceholder="Search steps…"
    >
      <List.Section title={summary} subtitle={`${completed} of ${routine.steps.length} steps completed`}>
        <List.Item
          id="result"
          title={summary}
          subtitle={deviceName}
          icon={
            result?.status === "completed"
              ? Icon.Checkmark
              : result?.status === "failed"
                ? Icon.ExclamationMark
                : Icon.Clock
          }
          detail={
            <List.Item.Detail
              markdown={
                result?.error ??
                (isRunning
                  ? "Use Cancel Routine to stop remaining steps. Going back from this view also requests cancellation. A command already accepted by the TV may still finish."
                  : result?.status === "cancelled"
                    ? "Remaining steps were cancelled. Steps already completed are kept."
                    : "All steps finished. Each command reports only the confirmation supported by the TV.")
              }
            />
          }
          actions={actions}
        />
      </List.Section>
      <List.Section title="Steps">
        {routine.steps.map((step, index) => {
          const failed = result?.failedStepIndex === index;
          const running = isRunning && progress?.stepIndex === index && progress.status === "running";
          const done = index < completed;
          const status = failed
            ? "Stopped"
            : done
              ? "Completed"
              : running
                ? "Running"
                : result?.status === "cancelled"
                  ? "Cancelled"
                  : "Waiting";
          return (
            <List.Item
              key={index}
              id={`step-${index}`}
              title={`${index + 1}. ${stepLabel(step)}`}
              // The detail pane hides accessories, so the status is in the subtitle and icon tint.
              subtitle={status}
              icon={{
                source: stepIcon(step),
                tintColor: failed ? Color.Red : done ? Color.Green : running ? Color.Blue : Color.SecondaryText,
              }}
              detail={<List.Item.Detail markdown={failed ? result?.error : `${stepLabel(step)}\n\n${status}`} />}
              actions={actions}
            />
          );
        })}
      </List.Section>
    </List>
  );
}
