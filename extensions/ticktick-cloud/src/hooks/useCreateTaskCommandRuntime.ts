import { useEffect, useLayoutEffect, useRef, useState } from "react";

import {
  isTrustedReadyCommandRuntime,
  type CommandRuntimeState,
  type ReadyCommandRuntime,
} from "../application/commandRuntime";
import {
  prepareCreateTaskCommandRuntime,
  type CreateTaskCommandRuntimeDependencies,
} from "../commands/createTaskCommandRuntime";
import type { CreateTaskRecoveryHandlers, CreateTaskRuntime } from "../components/CreateTaskCommand";
import { ProtocolError } from "../domain/errors";

const LOADING_STATE: CreateTaskRuntime = Object.freeze({ kind: "loading" });
const INVALID_RUNTIME_ERROR = Object.freeze(new ProtocolError("TickTick create command runtime is invalid."));
const INVALID_RUNTIME_STATE: CreateTaskRuntime = Object.freeze({
  kind: "error",
  error: INVALID_RUNTIME_ERROR,
});

type RuntimeInput =
  | Readonly<{ kind: "passthrough"; value: CreateTaskRuntime }>
  | Readonly<{ kind: "ready"; runtime: ReadyCommandRuntime; contextKey: string }>
  | Readonly<{ kind: "invalid" }>;

interface PreparationContext {
  readonly contextKey: string | undefined;
  started: boolean;
  active: boolean;
  committed: boolean;
  generation: number;
  disposalGeneration: number;
  controller?: AbortController;
  retry?: () => void;
}

interface PreparedState {
  readonly context: PreparationContext;
  readonly value: CreateTaskRuntime;
}

interface LatestInput {
  readonly runtime: CommandRuntimeState;
  readonly dependencies: CreateTaskCommandRuntimeDependencies;
}

export function useCreateTaskCommandRuntime(
  runtime: CommandRuntimeState,
  dependencies: CreateTaskCommandRuntimeDependencies
): CreateTaskRuntime {
  const input = snapshotRuntimeInput(runtime);
  const contextKey = input.kind === "ready" ? input.contextKey : undefined;
  const [storedContext, setStoredContext] = useState<PreparationContext>(() => createPreparationContext(contextKey));
  let renderContext = storedContext;
  if (storedContext.contextKey !== contextKey) {
    renderContext = createPreparationContext(contextKey);
    setStoredContext(renderContext);
  }

  const latestInputRef = useRef<LatestInput>({ runtime, dependencies });
  const committedContextRef = useRef<PreparationContext | undefined>(undefined);
  const [preparedState, setPreparedState] = useState<PreparedState>(() => ({
    context: renderContext,
    value: LOADING_STATE,
  }));

  const canPublish = (context: PreparationContext, generation: number): boolean =>
    context.active && context.committed && context.generation === generation && committedContextRef.current === context;

  const startPreparation = (context: PreparationContext, publishLoading: boolean): void => {
    if (!context.active || !context.committed || committedContextRef.current !== context) return;

    const generation = ++context.generation;
    context.controller?.abort();
    const controller = new AbortController();
    context.controller = controller;
    if (publishLoading) setPreparedState({ context, value: LOADING_STATE });

    const latest = latestInputRef.current;
    const ready = snapshotRuntimeInput(latest.runtime);
    if (ready.kind !== "ready" || ready.contextKey !== context.contextKey) return;

    void prepareCreateTaskCommandRuntime(ready.runtime, latest.dependencies, controller.signal).then(
      (value) => {
        if (!controller.signal.aborted && canPublish(context, generation)) {
          setPreparedState({ context, value });
        }
      },
      (error: unknown) => {
        if (controller.signal.aborted || !canPublish(context, generation)) return;
        const latestReady = snapshotRuntimeInput(latestInputRef.current.runtime);
        if (latestReady.kind !== "ready" || latestReady.contextKey !== context.contextKey) return;
        setPreparedState({
          context,
          value: Object.freeze({
            kind: "error",
            error,
            recovery: createRecovery(latestReady.runtime, context.retry),
          }),
        });
      }
    );
  };

  useLayoutEffect(() => {
    latestInputRef.current = { runtime, dependencies };
    const isReady = input.kind === "ready";
    committedContextRef.current = isReady ? renderContext : undefined;
    renderContext.committed = isReady;
    renderContext.retry = () => startPreparation(renderContext, true);
    return () => {
      renderContext.committed = false;
      if (committedContextRef.current === renderContext) committedContextRef.current = undefined;
    };
  }, [dependencies, input.kind, renderContext, runtime]);

  useEffect(() => {
    if (input.kind !== "ready") return;

    renderContext.active = true;
    renderContext.disposalGeneration += 1;
    if (!renderContext.started) {
      renderContext.started = true;
      startPreparation(renderContext, false);
    }

    return () => {
      renderContext.active = false;
      const disposalGeneration = ++renderContext.disposalGeneration;
      queueMicrotask(() => {
        if (renderContext.active || renderContext.disposalGeneration !== disposalGeneration) return;
        renderContext.generation += 1;
        renderContext.controller?.abort();
      });
    };
  }, [input.kind, renderContext]);

  if (input.kind === "passthrough") return input.value;
  if (input.kind === "invalid") return INVALID_RUNTIME_STATE;
  if (preparedState.context !== renderContext) return LOADING_STATE;
  if (preparedState.value.kind !== "error") return preparedState.value;
  return Object.freeze({
    kind: "error",
    error: preparedState.value.error,
    recovery: createRecovery(input.runtime, renderContext.retry),
  });
}

function snapshotRuntimeInput(value: unknown): RuntimeInput {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return Object.freeze({ kind: "invalid" });

  let kind: unknown;
  try {
    kind = Reflect.get(value, "kind");
  } catch {
    return Object.freeze({ kind: "invalid" });
  }

  if (kind === "loading" || kind === "error") {
    return Object.freeze({ kind: "passthrough", value: value as CreateTaskRuntime });
  }
  if (kind !== "ready" || !isTrustedReadyCommandRuntime(value)) return Object.freeze({ kind: "invalid" });

  let contextKey: unknown;
  try {
    contextKey = value.contextKey;
  } catch {
    return Object.freeze({ kind: "invalid" });
  }
  if (typeof contextKey !== "string" || !/^[a-f0-9]{64}$/.test(contextKey)) {
    return Object.freeze({ kind: "invalid" });
  }
  return Object.freeze({ kind: "ready", runtime: value, contextKey });
}

function createPreparationContext(contextKey: string | undefined): PreparationContext {
  return {
    contextKey,
    started: false,
    active: false,
    committed: false,
    generation: 0,
    disposalGeneration: 0,
  };
}

function createRecovery(runtime: ReadyCommandRuntime, onRetry: (() => void) | undefined): CreateTaskRecoveryHandlers {
  return Object.freeze({
    ...(runtime.onReconnect === undefined ? {} : { onReconnect: runtime.onReconnect }),
    ...(runtime.onOpenPreferences === undefined ? {} : { onOpenPreferences: runtime.onOpenPreferences }),
    ...(onRetry === undefined ? {} : { onRetry }),
  });
}
