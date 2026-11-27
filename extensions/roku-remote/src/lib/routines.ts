export type RoutineStep =
  | { type: "wake" }
  | { type: "launch"; appId: string; appName?: string }
  | { type: "key"; key: string; count?: number }
  | { type: "wait"; seconds: number }
  | { type: "restore" };

export interface Routine {
  id: string;
  name: string;
  deviceId: string;
  description?: string;
  steps: RoutineStep[];
}

export const ROUTINE_KEYS = [
  "Home",
  "Back",
  "Up",
  "Down",
  "Left",
  "Right",
  "Select",
  "Info",
  "Play",
  "Rev",
  "Fwd",
  "InstantReplay",
  "VolumeUp",
  "VolumeDown",
  "VolumeMute",
  "PowerOff",
  "ChannelUp",
  "ChannelDown",
  "FindRemote",
  "Backspace",
  "Enter",
] as const;

const allowedKeys = new Set<string>(ROUTINE_KEYS);

export class RoutineValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RoutineValidationError";
  }
}

function object(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function requiredText(value: unknown, label: string, maximum: number): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > maximum) {
    throw new RoutineValidationError(`${label} must contain between 1 and ${maximum} characters.`);
  }
  return value.trim();
}

function optionalText(value: unknown, label: string, maximum: number): string | undefined {
  if (value === undefined || value === "") return undefined;
  if (typeof value === "string" && !value.trim()) return undefined;
  return requiredText(value, label, maximum);
}

/** Validate storage and form values before any device commands run. */
export function validateRoutine(value: unknown): Routine {
  const routine = object(value);
  if (!routine) throw new RoutineValidationError("This routine is invalid. Edit it or create a new one.");
  const id = requiredText(routine.id, "Routine ID", 128);
  const name = requiredText(routine.name, "Routine name", 80);
  const deviceId = requiredText(routine.deviceId, "TV ID", 256);
  const description = optionalText(routine.description, "Description", 300);
  if (!Array.isArray(routine.steps) || routine.steps.length < 1 || routine.steps.length > 20) {
    throw new RoutineValidationError("A routine must have between 1 and 20 steps.");
  }
  const steps: RoutineStep[] = routine.steps.map((value, index) => {
    const step = object(value);
    const label = `Step ${index + 1}`;
    if (!step) throw new RoutineValidationError(`${label} is invalid.`);
    switch (step.type) {
      case "wake":
        return { type: "wake" };
      case "restore":
        return { type: "restore" };
      case "launch": {
        const appId = requiredText(step.appId, `${label} app ID`, 128);
        if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(appId)) {
          throw new RoutineValidationError(`${label} has an invalid Roku app ID.`);
        }
        return { type: "launch", appId, appName: optionalText(step.appName, `${label} app name`, 160) };
      }
      case "key": {
        const key = requiredText(step.key, `${label} remote key`, 32);
        if (!allowedKeys.has(key)) throw new RoutineValidationError(`${label} uses an unsupported remote key.`);
        const count = step.count === undefined ? 1 : step.count;
        if (typeof count !== "number" || !Number.isInteger(count) || count < 1 || count > 20) {
          throw new RoutineValidationError(`${label} must repeat between 1 and 20 times.`);
        }
        return { type: "key", key, count };
      }
      case "wait": {
        const seconds = step.seconds;
        if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds < 0 || seconds > 30) {
          throw new RoutineValidationError(`${label} must wait between 0 and 30 seconds.`);
        }
        return { type: "wait", seconds };
      }
      default:
        throw new RoutineValidationError(`${label} has an unsupported action.`);
    }
  });
  return { id, name, deviceId, description, steps };
}

export function describeRoutineStep(step: RoutineStep): string {
  switch (step.type) {
    case "wake":
      return "Turn TV on";
    case "launch":
      return `Open ${step.appName || step.appId}`;
    case "restore":
      return "Restore previous app or input";
    case "wait":
      return `Wait ${step.seconds} ${step.seconds === 1 ? "second" : "seconds"}`;
    case "key":
      return `${step.key}${(step.count ?? 1) > 1 ? ` × ${step.count}` : ""}`;
  }
}

export interface RoutineAdapter {
  wake(): Promise<void>;
  launch(appId: string): Promise<void>;
  key(key: string): Promise<void>;
  restore(): Promise<void>;
}

export interface RoutineProgress {
  stepIndex: number;
  stepNumber: number;
  totalSteps: number;
  step: RoutineStep;
  status: "running" | "completed";
}

export interface RunRoutineOptions {
  signal?: AbortSignal;
  onProgress?: (progress: RoutineProgress) => void | Promise<void>;
}

export interface RoutineRunResult {
  status: "completed" | "cancelled" | "failed";
  completedSteps: number;
  totalSteps: number;
  failedStepIndex?: number;
  cancelledStepIndex?: number;
  error?: string;
}

class RoutineCancelled extends Error {}

function checkCancelled(signal?: AbortSignal) {
  if (signal?.aborted) throw new RoutineCancelled();
}

function wait(seconds: number, signal?: AbortSignal): Promise<void> {
  checkCancelled(signal);
  if (seconds === 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const aborted = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", aborted);
      reject(new RoutineCancelled());
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", aborted);
      resolve();
    }, seconds * 1000);
    signal?.addEventListener("abort", aborted, { once: true });
    if (signal?.aborted) aborted();
  });
}

/** Cancellation stops future work; an already-sent device command cannot be undone. */
export async function runRoutine(
  value: Routine,
  adapter: RoutineAdapter,
  options: RunRoutineOptions = {},
): Promise<RoutineRunResult> {
  let routine: Routine;
  try {
    routine = validateRoutine(value);
  } catch (error) {
    return {
      status: "failed",
      completedSteps: 0,
      totalSteps: Array.isArray(value?.steps) ? value.steps.length : 0,
      error: error instanceof Error ? error.message : "The routine is invalid.",
    };
  }
  let completedSteps = 0;
  const totalSteps = routine.steps.length;
  for (let index = 0; index < totalSteps; index++) {
    const step = routine.steps[index];
    const progress = { stepIndex: index, stepNumber: index + 1, totalSteps, step: { ...step } };
    try {
      checkCancelled(options.signal);
      await options.onProgress?.({ ...progress, status: "running" });
      checkCancelled(options.signal);
      switch (step.type) {
        case "wake":
          await adapter.wake();
          break;
        case "launch":
          await adapter.launch(step.appId);
          break;
        case "restore":
          await adapter.restore();
          break;
        case "wait":
          await wait(step.seconds, options.signal);
          break;
        case "key":
          for (let repetition = 0; repetition < (step.count ?? 1); repetition++) {
            checkCancelled(options.signal);
            await adapter.key(step.key);
          }
          break;
      }
      completedSteps++;
      await options.onProgress?.({ ...progress, status: "completed" });
    } catch (error) {
      if (error instanceof RoutineCancelled || options.signal?.aborted) {
        return { status: "cancelled", completedSteps, totalSteps, cancelledStepIndex: index };
      }
      return {
        status: "failed",
        completedSteps,
        totalSteps,
        failedStepIndex: index,
        error: `Step ${index + 1} (${describeRoutineStep(step)}) failed: ${error instanceof Error ? error.message : "Could not complete the command."}`,
      };
    }
  }
  return { status: "completed", completedSteps, totalSteps };
}
