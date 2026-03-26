import { Toast, showToast } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { resolveExecutionContext } from "../core/executionContext";
import { runInlineFlow, runPanelFlow } from "../core/execution";
import { InputSource } from "../core/input";
import { logger } from "../core/logger";

type RunPromptOptions = {
  prompt: string;
  title?: string;
  overrideInput?: string;
  inputSource: InputSource;
  inputText: string;
};

export type ExecutionViewState = "idle" | "running" | "done";

export function usePromptExecution(options?: { autoRunPrompt?: string }) {
  const [generatedResult, setGeneratedResult] = useState<string | null>(null);
  const [panelStatusTitle, setPanelStatusTitle] = useState<string | undefined>(undefined);
  const [viewState, setViewState] = useState<ExecutionViewState>(options?.autoRunPrompt ? "running" : "idle");
  const abortControllerRef = useRef<AbortController | null>(null);
  const runIdRef = useRef(0);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const abortCurrentRun = () => {
    abortControllerRef.current?.abort();
    setGeneratedResult(null);
    setPanelStatusTitle(undefined);
    setViewState("idle");
  };

  const handleRun = async ({ prompt, title, overrideInput, inputSource, inputText }: RunPromptOptions) => {
    abortCurrentRun();
    const runId = ++runIdRef.current;
    abortControllerRef.current = new AbortController();
    setGeneratedResult(null);
    setPanelStatusTitle(undefined);
    setViewState("running");

    const signal = abortControllerRef.current.signal;
    const isCurrentRun = () => runIdRef.current === runId;

    const startTime = logger.isEnabled() ? Date.now() : 0;
    if (logger.isEnabled()) {
      logger.info(`[UI] Starting handleRun for ${title || "Custom Prompt"}`);
    }

    try {
      const finalInput = overrideInput ?? (inputSource === "selected" ? inputText : "");

      if (!finalInput) {
        if (isCurrentRun()) {
          setViewState("idle");
        }
        await showToast({
          style: Toast.Style.Failure,
          title: "No text selected",
        });
        return;
      }

      const context = await resolveExecutionContext();

      if (options?.autoRunPrompt && context.settings.editableTextHandling === "inline") {
        await runInlineFlow({
          prompt,
          input: finalInput,
          title: title || "Processing...",
          context,
          signal,
        });
        if (isCurrentRun()) {
          setPanelStatusTitle(undefined);
          setViewState("idle");
        }
        return;
      }

      const flowResult = await runPanelFlow({
        prompt,
        input: finalInput,
        title,
        context,
        signal,
        onResultChange: (result) => {
          if (isCurrentRun()) {
            setGeneratedResult(result);
          }
        },
        onStatusChange: (statusTitle) => {
          if (isCurrentRun()) {
            setPanelStatusTitle(statusTitle);
          }
        },
      });

      if (logger.isEnabled()) {
        const totalTime = Date.now() - startTime;
        logger.info(`[UI] Task complete. Total time from trigger to display: ${totalTime}ms`);
      }

      if (flowResult.status === "aborted") {
        if (isCurrentRun()) {
          setGeneratedResult(null);
          setPanelStatusTitle(undefined);
          setViewState("idle");
        }
        return;
      }

      if (isCurrentRun()) {
        if (flowResult.status !== "success") {
          setPanelStatusTitle(undefined);
        }
        setViewState(flowResult.status === "success" ? "done" : "idle");
      }
    } catch (error) {
      if (error instanceof Error && (error.message === "AbortError" || error.name === "AbortError")) {
        if (isCurrentRun()) {
          setGeneratedResult(null);
          setPanelStatusTitle(undefined);
          setViewState("idle");
        }
        return;
      }

      if (isCurrentRun()) {
        setGeneratedResult(null);
        setPanelStatusTitle(undefined);
        setViewState("idle");
      }
    }
  };

  return {
    abortCurrentRun,
    generatedResult,
    handleRun,
    panelStatusTitle,
    viewState,
  };
}
