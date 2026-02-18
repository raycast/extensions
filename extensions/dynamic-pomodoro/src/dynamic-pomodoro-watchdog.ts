import type { LaunchType } from "@raycast/api";
import { getDeliverableEvents, type CompletionOutboxStore } from "./completion-outbox.ts";
import { deliverCompletionEvent as deliverCompletionEventViaPipeline } from "./completion-pipeline.ts";
import { notifyTimerFinished } from "./timer-notifications.ts";
import { recordRetryDrainAttempt, recordWatchdogRun } from "./dynamic-pomodoro-watchdog-diagnostics.ts";
import type { TimerState } from "./timer-state.ts";
import { getEffectivePomodoroStyle } from "./timer-state.ts";

declare function require(name: "@raycast/api"): typeof import("@raycast/api");

type WatchdogDeps = {
  completionOutboxStore?: CompletionOutboxStore;
  now?: () => number;
  launchType?: LaunchType;
  drainBatchLimit?: number;
  loadTimerState?: () => Promise<TimerState>;
  hydrateTimerAfterLoad?: (state: TimerState, nowMs: number) => Promise<TimerState> | TimerState;
  saveTimerState?: (state: TimerState) => Promise<void>;
  shouldNotifyFinishedAfterLoad?: (storedState: TimerState, hydratedState: TimerState) => Promise<boolean> | boolean;
  notifyTimerFinished?: typeof notifyTimerFinished;
  recordWatchdogRun?: (launchType: LaunchType | undefined) => Promise<void>;
  getDeliverableEvents?: typeof getDeliverableEvents;
  deliverCompletionEvent?: typeof deliverCompletionEventViaPipeline;
  recordRetryDrainAttempt?: typeof recordRetryDrainAttempt;
};

const DEFAULT_DRAIN_BATCH_LIMIT = 3;
const BACKGROUND_LAUNCH_TYPE = "background" as LaunchType;

function getEnvironmentLaunchType(): LaunchType | undefined {
  try {
    const { environment } = require("@raycast/api");
    return environment.launchType as LaunchType | undefined;
  } catch {
    return undefined;
  }
}

async function defaultLoadTimerState(): Promise<TimerState> {
  const timerCore = await import("./timer-core.ts");
  return timerCore.loadTimerState();
}

async function defaultSaveTimerState(state: TimerState): Promise<void> {
  const timerCore = await import("./timer-core.ts");
  await timerCore.saveTimerState(state);
}

async function defaultHydrateTimerAfterLoad(state: TimerState, nowMs: number): Promise<TimerState> {
  const timerCore = await import("./timer-core.ts");
  return timerCore.hydrateTimerAfterLoad(state, nowMs);
}

async function defaultShouldNotifyFinishedAfterLoad(storedState: TimerState, hydratedState: TimerState): Promise<boolean> {
  const timerCore = await import("./timer-core.ts");
  return timerCore.shouldNotifyFinishedAfterLoad(storedState, hydratedState);
}

export async function runDynamicPomodoroWatchdog(deps: WatchdogDeps = {}): Promise<void> {
  const now = deps.now ?? (() => Date.now());
  const launchType = deps.launchType ?? getEnvironmentLaunchType() ?? BACKGROUND_LAUNCH_TYPE;
  const loadState = deps.loadTimerState ?? defaultLoadTimerState;
  const hydrateState = deps.hydrateTimerAfterLoad ?? defaultHydrateTimerAfterLoad;
  const saveState = deps.saveTimerState ?? defaultSaveTimerState;
  const shouldNotify = deps.shouldNotifyFinishedAfterLoad ?? defaultShouldNotifyFinishedAfterLoad;
  const notifyCompletion = deps.notifyTimerFinished ?? notifyTimerFinished;
  const recordRun = deps.recordWatchdogRun ?? recordWatchdogRun;
  const readDeliverable = deps.getDeliverableEvents ?? getDeliverableEvents;
  const deliverCompletionEvent = deps.deliverCompletionEvent ?? deliverCompletionEventViaPipeline;
  const recordRetry = deps.recordRetryDrainAttempt ?? recordRetryDrainAttempt;

  const storedState = await loadState();
  const hydratedState = await hydrateState(storedState, now());
  await recordRun(launchType);

  if (await shouldNotify(storedState, hydratedState)) {
    await notifyCompletion({
      launchType,
      completionId: hydratedState.lastCompletedAt,
      pomodoroStyle: getEffectivePomodoroStyle(hydratedState),
    });
  }

  await saveState(hydratedState);

  const drainBatchLimit = Math.max(1, Math.round(deps.drainBatchLimit ?? DEFAULT_DRAIN_BATCH_LIMIT));
  const deliverableEvents = await readDeliverable({
    store: deps.completionOutboxStore,
    now,
    limit: drainBatchLimit,
  });

  for (const event of deliverableEvents) {
    try {
      const result = await deliverCompletionEvent(
        {
          completionId: event.completionId,
          launchType,
        },
        {
          store: deps.completionOutboxStore,
          now,
        },
      );
      await recordRetry({
        launchType,
        completionId: event.completionId,
        error: result.status === "failed" ? "retry delivery failed" : undefined,
      });
    } catch (error) {
      await recordRetry({
        launchType,
        completionId: event.completionId,
        error,
      });
    }
  }
}

export default async function Command() {
  await runDynamicPomodoroWatchdog();
}
