import { LocalStorage } from "@raycast/api";
import { useSyncExternalStore } from "react";

const ANSWER_MODEL_KEY = "answer-model";

/** `undefined` while LocalStorage loads; afterwards `stored` is undefined until a first choice is made. */
type State = { stored: string | undefined } | undefined;

// One copy for the whole command. Every screen on the navigation stack reads it, so a choice made
// on one screen reaches the others at once and no screen can save over it with a stale value.
let state: State;
let loading: Promise<void> | undefined;
let lastWrite: Promise<void> = Promise.resolve();
const listeners = new Set<() => void>();

function setState(next: State) {
  state = next;
  listeners.forEach((listener) => listener());
}

/** Values are JSON strings, the format `useLocalStorage` wrote in earlier versions. */
function decode(item: string | undefined): string | undefined {
  if (item === undefined) {
    return undefined;
  }
  try {
    const value: unknown = JSON.parse(item);
    return typeof value === "string" ? value : undefined;
  } catch {
    return item;
  }
}

function load() {
  loading ??= LocalStorage.getItem<string>(ANSWER_MODEL_KEY)
    .catch(() => undefined)
    .then((item) => {
      // A choice made while loading wins over what was stored.
      if (!state) {
        setState({ stored: decode(item) });
      }
    });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  load();
  return () => {
    listeners.delete(listener);
  };
}

/** Saves the choice; `undefined` means Delta's default. Screens update before the write finishes. */
function setModel(model: string | undefined): Promise<void> {
  const stored = model ?? "";
  setState({ stored });
  // Writes are queued so the last choice is also the last one written.
  lastWrite = lastWrite
    .then(() => LocalStorage.setItem(ANSWER_MODEL_KEY, JSON.stringify(stored)))
    .catch(() => undefined);
  return lastWrite;
}

/**
 * The model chosen for answers, shared by every command. Stored as "" for Delta's default and
 * missing until the user picks for the first time, so the first question can ask. Kept in
 * LocalStorage rather than preferences because the list of models is only known at runtime.
 */
export function useAnswerModel() {
  const current = useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  );
  return {
    /** `provider/model-id`, or undefined for Delta's default. */
    model: current?.stored || undefined,
    /** False until a model, or Delta's default, has been picked once. */
    hasChosen: current?.stored !== undefined,
    isLoading: current === undefined,
    setModel,
  };
}
