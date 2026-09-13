import { useEffect, useLayoutEffect, useRef, useState } from "react";

import {
  createCommandRuntimeController,
  type CommandRuntimeBootstrap,
  type CommandRuntimeController,
  type CommandRuntimeState,
} from "../application/commandRuntime";
import { ProtocolError } from "../domain/errors";

const LOADING_STATE: CommandRuntimeState = Object.freeze({ kind: "loading" });
const INVALID_CONTEXT_ERROR = Object.freeze(new ProtocolError("TickTick command runtime context is invalid."));
const INVALID_CONTEXT_STATE: CommandRuntimeState = Object.freeze({
  kind: "error",
  error: INVALID_CONTEXT_ERROR,
});

interface RuntimeContext {
  readonly contextKey: string | undefined;
  readonly initialState: CommandRuntimeState;
  controller?: CommandRuntimeController;
  started: boolean;
  active: boolean;
  committed: boolean;
  disposalGeneration: number;
}

interface ContextState {
  readonly context: RuntimeContext;
  readonly value: CommandRuntimeState;
}

export function useCommandRuntime(bootstrap: CommandRuntimeBootstrap, contextKey: string): CommandRuntimeState {
  const safeContextKey = isSafeContextKey(contextKey) ? contextKey : undefined;
  const [storedContext, setStoredContext] = useState<RuntimeContext>(() => createRuntimeContext(safeContextKey));
  let renderContext = storedContext;
  if (storedContext.contextKey !== safeContextKey) {
    renderContext = createRuntimeContext(safeContextKey);
    setStoredContext(renderContext);
  }
  const bootstrapRef = useRef(bootstrap);
  const committedContextRef = useRef<RuntimeContext | undefined>(undefined);
  const [state, setState] = useState<ContextState>(() => ({
    context: renderContext,
    value: renderContext.initialState,
  }));
  const visibleState = state.context === renderContext ? state.value : renderContext.initialState;

  useLayoutEffect(() => {
    bootstrapRef.current = bootstrap;
    committedContextRef.current = renderContext;
    renderContext.committed = true;
    return () => {
      renderContext.committed = false;
    };
  }, [bootstrap, renderContext]);

  useEffect(() => {
    if (renderContext.contextKey === undefined) return;
    renderContext.active = true;
    renderContext.disposalGeneration += 1;
    if (!renderContext.controller) {
      renderContext.controller = createCommandRuntimeController((value) => {
        if (!renderContext.active || !renderContext.committed || committedContextRef.current !== renderContext) return;
        setState({ context: renderContext, value });
      });
    }
    if (!renderContext.started) {
      renderContext.started = true;
      void renderContext.controller.load(() => bootstrapRef.current());
    }

    return () => {
      renderContext.active = false;
      const disposalGeneration = ++renderContext.disposalGeneration;
      queueMicrotask(() => {
        if (renderContext.active || renderContext.disposalGeneration !== disposalGeneration) return;
        renderContext.controller?.dispose();
      });
    };
  }, [renderContext]);

  return visibleState;
}

function createRuntimeContext(contextKey: string | undefined): RuntimeContext {
  return {
    contextKey,
    initialState: contextKey === undefined ? INVALID_CONTEXT_STATE : LOADING_STATE,
    started: false,
    active: false,
    committed: false,
    disposalGeneration: 0,
  };
}

function isSafeContextKey(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || value !== value.trim()) return false;

  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit <= 0x1f || (codeUnit >= 0x7f && codeUnit <= 0x9f)) return false;
    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const nextCodeUnit = value.charCodeAt(index + 1);
      if (!(nextCodeUnit >= 0xdc00 && nextCodeUnit <= 0xdfff)) return false;
      index += 1;
    } else if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      return false;
    }
  }

  return !Array.from(value).some((character) => /\p{Cf}/u.test(character));
}
