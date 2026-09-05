import { presentError } from "../application/errorPresentation";
import { requireTaskDestination, type TaskDestinationDependencies } from "../application/taskDestination";
import { AmbiguousMutationError } from "../domain/errors";
import type { CreateTaskInput, Task } from "../domain/task";
import { runQuickAdd } from "./runQuickAdd";

export type QuickAddCommandToast = Readonly<{
  style: "animated" | "success" | "failure";
  title: string;
  message?: string;
}>;

export type QuickAddCommandEffects = Readonly<{
  showToast(toast: QuickAddCommandToast): unknown | Promise<unknown>;
  closeMainWindow(options: Readonly<{ clearRootSearch: true }>): unknown | Promise<unknown>;
}>;

export type QuickAddCommandDependencies = TaskDestinationDependencies &
  Readonly<{
    createTask(input: CreateTaskInput): Promise<Task>;
    effects: QuickAddCommandEffects;
  }>;

export type QuickAddCommandInput = Readonly<{
  text?: unknown;
  fallbackText?: unknown;
  description?: unknown;
}>;

const AMBIGUOUS_GUIDANCE = "TickTick may have created this task. Check TickTick before trying again.";

export async function executeQuickAddCommand(
  dependencies: QuickAddCommandDependencies,
  input: QuickAddCommandInput
): Promise<void> {
  const snapshot = snapshotInput(input);
  await ignoreFailure(() => dependencies.effects.showToast({ style: "animated", title: "Adding Task" }));

  try {
    const destination = await requireTaskDestination(dependencies);
    await runQuickAdd(
      {
        createTask: (createInput) => dependencies.createTask(createInput),
        resolveDestination: async () => destination,
      },
      snapshot
    );
  } catch (error) {
    await ignoreFailure(() => dependencies.effects.showToast(presentQuickAddCommandFailure(error)));
    return;
  }

  await ignoreFailure(() => dependencies.effects.showToast({ style: "success", title: "Task Added" }));
  await ignoreFailure(() => dependencies.effects.closeMainWindow({ clearRootSearch: true }));
}

function snapshotInput(input: unknown): Readonly<{ title: string; description?: string }> {
  const text = readField(input, "text");
  const fallbackText = readField(input, "fallbackText");
  const description = readField(input, "description");
  const title = typeof text === "string" ? text : typeof fallbackText === "string" ? fallbackText : "";

  return Object.freeze(typeof description === "string" ? { title, description } : { title });
}

function readField(input: unknown, field: "text" | "fallbackText" | "description"): unknown {
  if ((typeof input !== "object" && typeof input !== "function") || input === null) return undefined;

  try {
    return (input as Record<string, unknown>)[field];
  } catch {
    return undefined;
  }
}

export function presentQuickAddCommandFailure(error: unknown): QuickAddCommandToast {
  if (isAmbiguousMutation(error)) {
    return {
      style: "failure",
      title: "Task Creation Status Unknown",
      message: AMBIGUOUS_GUIDANCE,
    };
  }

  return {
    style: "failure",
    title: "Task Could Not Be Added",
    message: presentError(error, "mutation").message,
  };
}

function isAmbiguousMutation(error: unknown): boolean {
  try {
    return error instanceof AmbiguousMutationError;
  } catch {
    return false;
  }
}

async function ignoreFailure(operation: () => unknown | Promise<unknown>): Promise<void> {
  try {
    await operation();
  } catch {
    return;
  }
}
