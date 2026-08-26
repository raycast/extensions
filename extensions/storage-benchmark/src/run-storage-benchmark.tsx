import { Action, ActionPanel, Detail, Icon, LaunchType, launchCommand, openExtensionPreferences } from "@raycast/api";
import { randomUUID } from "node:crypto";
import { useCallback, useEffect, useRef, useState } from "react";
import { cleanupStaleBenchmarkFiles } from "./benchmark/destination";
import { BenchmarkCancelledError } from "./benchmark/engine";
import { contextualizeBenchmarkFailure } from "./benchmark/errors";
import { BenchmarkEvent } from "./benchmark/protocol";
import { BenchmarkTarget, benchmarkTargetFromConfiguration } from "./benchmark/targets";
import { BenchmarkConfigurationForm } from "./components/BenchmarkConfigurationForm";
import { BenchmarkDisclosureList } from "./components/BenchmarkDisclosureList";
import { BenchmarkResultList } from "./components/BenchmarkResultList";
import { BenchmarkRunningList } from "./components/BenchmarkRunningList";
import { BenchmarkDataSizePicker, BenchmarkDurationPicker } from "./components/BenchmarkTargetPicker";
import { DestinationPicker } from "./components/DestinationPicker";
import { MethodologyDetail } from "./components/MethodologyDetail";
import { BenchmarkRunInput } from "./history/history";
import { interpretStoredRun, ResultInterpretation } from "./history/interpretation";
import {
  resolveBenchmarkPreferenceSummary,
  resolveDestinationRoot,
  resolveRunConfiguration,
} from "./raycast/preferences";
import { benchmarkHistory, createBenchmarkEngine } from "./raycast/services";
import { rememberDestinationRoot } from "./raycast/storage";

type ReadyState = { kind: "ready"; destinationRoot: string } & BenchmarkTarget;
type CompletedState = {
  kind: "completed";
  run: BenchmarkRunInput;
  interpretation: ResultInterpretation;
  destinationRoot: string;
};
type FailedState = { kind: "failed"; title: string; message: string; destinationRoot: string; target: BenchmarkTarget };
type DestinationReturnState = ReadyState | CompletedState | FailedState;

type CommandState =
  | { kind: "loading" }
  | ReadyState
  | { kind: "running"; destinationRoot: string; target: BenchmarkTarget; event?: BenchmarkEvent }
  | CompletedState
  | FailedState
  | {
      kind: "choosing-destination";
      currentRoot: string;
      target: BenchmarkTarget;
      previousState: DestinationReturnState;
    };

export default function RunStorageBenchmarkCommand() {
  const [state, setState] = useState<CommandState>({ kind: "loading" });
  const abortController = useRef<AbortController | undefined>(undefined);
  const mounted = useRef(true);

  const startBenchmark = useCallback(async (destinationOverride?: string, targetOverride?: BenchmarkTarget) => {
    abortController.current?.abort();
    const controller = new AbortController();
    abortController.current = controller;
    let destinationRoot = destinationOverride ?? "";
    const target = targetOverride ?? resolveBenchmarkPreferenceSummary();

    try {
      destinationRoot = await resolveDestinationRoot(destinationOverride);
      const configuration = await resolveRunConfiguration(destinationRoot, target);
      if (mounted.current) setState({ kind: "running", destinationRoot, target });

      await cleanupStaleBenchmarkFiles(configuration.directory);
      const result = await createBenchmarkEngine().run(configuration, {
        signal: controller.signal,
        onEvent: (event) => {
          if (mounted.current) setState({ kind: "running", destinationRoot, target, event });
        },
      });
      if (!result.volume) throw new Error("The helper did not identify the destination volume");

      const run: BenchmarkRunInput = {
        id: randomUUID(),
        completedAt: new Date().toISOString(),
        volume: result.volume,
        result,
        configuration: {
          maxBytes: configuration.maxBytes,
          warmupBytes: configuration.warmupBytes,
          targetDurationSeconds: configuration.targetDurationSeconds,
          chunkSizeBytes: configuration.chunkSizeBytes,
        },
      };
      await benchmarkHistory.recordSuccess(run);
      const snapshot = await benchmarkHistory.snapshot();
      const interpretation = interpretStoredRun(snapshot, run);
      if (mounted.current) setState({ kind: "completed", run, interpretation, destinationRoot });
    } catch (error) {
      const cancelled = error instanceof BenchmarkCancelledError || controller.signal.aborted;
      const title = cancelled ? "Benchmark Cancelled" : "Benchmark Failed";
      const failure = contextualizeBenchmarkFailure(error);
      const message = failure.message;
      await benchmarkHistory.recordDiagnostic({
        id: randomUUID(),
        completedAt: new Date().toISOString(),
        status: cancelled ? "cancelled" : "failed",
        code: cancelled ? "cancelled" : failure.code,
        message: sanitizedDiagnosticMessage(message),
      });
      if (mounted.current) setState({ kind: "failed", title, message, destinationRoot, target });
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void (async () => {
      const destinationRoot = await resolveDestinationRoot();
      const target = resolveBenchmarkPreferenceSummary();
      if (mounted.current) setState({ kind: "ready", destinationRoot, ...target });
    })();

    return () => {
      mounted.current = false;
      abortController.current?.abort();
    };
  }, [startBenchmark]);

  async function startConfirmedBenchmark(destinationRoot: string, target: BenchmarkTarget) {
    await startBenchmark(destinationRoot, target);
  }

  function openDestinationPicker(currentRoot: string, target: BenchmarkTarget, previousState: DestinationReturnState) {
    setState({
      kind: "choosing-destination",
      currentRoot,
      target: benchmarkTargetFromConfiguration(target),
      previousState,
    });
  }

  async function chooseDestination(root: string, target: BenchmarkTarget) {
    await rememberDestinationRoot(root);
    setState({ ...target, kind: "ready", destinationRoot: root });
  }

  function reviewTarget(destinationRoot: string, target: BenchmarkTarget) {
    setState({ kind: "ready", destinationRoot, ...target });
  }

  async function startConfiguredBenchmark(destinationRoot: string, target: BenchmarkTarget) {
    void startBenchmark(destinationRoot, target);
  }

  if (state.kind === "loading") return <Detail isLoading markdown="# Preparing Storage Benchmark" />;
  if (state.kind === "choosing-destination") {
    return (
      <DestinationPicker
        currentRoot={state.currentRoot}
        onSave={(root) => chooseDestination(root, state.target)}
        onCancel={() => setState(state.previousState)}
      />
    );
  }
  if (state.kind === "ready") {
    const actions = (primary: "start" | "destination" | "maximum-data" | "time-target") => {
      const startAction = (
        <Action
          title="Start Test"
          icon={Icon.Play}
          onAction={() => startConfirmedBenchmark(state.destinationRoot, state)}
        />
      );
      const destinationAction = (
        <Action
          title="Choose Disk or Folder"
          icon={Icon.HardDrive}
          onAction={() => openDestinationPicker(state.destinationRoot, state, state)}
        />
      );
      const maximumDataAction = (
        <Action.Push
          title="Change Maximum Test Data"
          icon={Icon.Gauge}
          target={
            <BenchmarkDataSizePicker
              target={state}
              onChange={(target) => reviewTarget(state.destinationRoot, target)}
            />
          }
        />
      );
      const timeTargetAction = (
        <Action.Push
          title="Change Time Target"
          icon={Icon.Stopwatch}
          target={
            <BenchmarkDurationPicker
              target={state}
              onChange={(target) => reviewTarget(state.destinationRoot, target)}
            />
          }
        />
      );

      return (
        <ActionPanel>
          {primary === "start"
            ? startAction
            : primary === "destination"
              ? destinationAction
              : primary === "maximum-data"
                ? maximumDataAction
                : timeTargetAction}
          {primary !== "start" && startAction}
          {primary !== "maximum-data" && maximumDataAction}
          {primary !== "time-target" && timeTargetAction}
          {primary !== "destination" && destinationAction}
          <Action.Push
            title="Configure Test"
            icon={Icon.Gear}
            target={
              <BenchmarkConfigurationForm
                target={state}
                onStart={(target) => startConfiguredBenchmark(state.destinationRoot, target)}
              />
            }
          />
          <Action.Push title="How the Test Works" icon={Icon.Info} target={<MethodologyDetail />} />
        </ActionPanel>
      );
    };

    return (
      <BenchmarkDisclosureList
        destinationRoot={state.destinationRoot}
        maxBytes={state.maxBytes}
        targetDurationSeconds={state.targetDurationSeconds}
        destinationActions={actions("destination")}
        maximumDataActions={actions("maximum-data")}
        timeTargetActions={actions("time-target")}
        safeguardActions={actions("start")}
      />
    );
  }

  if (state.kind === "running") {
    return (
      <BenchmarkRunningList
        event={state.event}
        target={state.target}
        actions={
          <ActionPanel>
            <Action title="Cancel Test" icon={Icon.Stop} onAction={() => abortController.current?.abort()} />
            <Action.Push title="How the Test Works" icon={Icon.Info} target={<MethodologyDetail />} />
          </ActionPanel>
        }
      />
    );
  }

  if (state.kind === "failed") {
    return (
      <Detail
        markdown={`# ${state.title}\n\n${escapeMarkdown(state.message)}\n\nNo benchmark data was retained.`}
        actions={commandActions(
          state.target,
          () => startBenchmark(state.destinationRoot, state.target),
          () => openDestinationPicker(state.destinationRoot, state.target, state),
          (target) => startBenchmark(state.destinationRoot, target),
        )}
      />
    );
  }

  const target = benchmarkTargetFromConfiguration(state.run.configuration);
  return (
    <BenchmarkResultList
      result={state.run.result}
      configuration={state.run.configuration}
      interpretation={state.interpretation}
      actions={commandActions(
        target,
        () => startBenchmark(state.destinationRoot, target),
        () => openDestinationPicker(state.destinationRoot, target, state),
        (nextTarget) => startBenchmark(state.destinationRoot, nextTarget),
      )}
    />
  );
}

function commandActions(
  target: BenchmarkTarget,
  rerun: () => void,
  changeDestination: () => void,
  runWithTarget: (target: BenchmarkTarget) => Promise<void>,
) {
  return (
    <ActionPanel>
      <Action title="Run Again" icon={Icon.Repeat} onAction={rerun} />
      <Action.Push
        title="Configure and Run"
        icon={Icon.Gear}
        target={<BenchmarkConfigurationForm target={target} onStart={(nextTarget) => void runWithTarget(nextTarget)} />}
      />
      <Action title="Change Disk or Folder" icon={Icon.HardDrive} onAction={changeDestination} />
      <Action
        title="View Storage History"
        icon={Icon.Clock}
        onAction={() => launchCommand({ name: "view-storage-history", type: LaunchType.UserInitiated })}
      />
      <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
      <Action.Push title="How the Test Works" icon={Icon.Info} target={<MethodologyDetail />} />
    </ActionPanel>
  );
}

function escapeMarkdown(value: string): string {
  return value.replace(/[\\`*_{}[\]()#+.!-]/g, "\\$&");
}

function sanitizedDiagnosticMessage(message: string): string {
  return message.replace(/(['"])(\/[^'"]+)\1/g, "the selected folder");
}
