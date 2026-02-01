import React, { useCallback, useState } from "react";
import { Toast, showToast } from "@raycast/api";
import { LLMProviderError } from "shared/lib/llm-provider";
import { improveOptimizedPrompt, optimizePrompt, retryOptimizePrompt } from "../lib/optimize-prompt";
import { OptimizedPromptDetail } from "./OptimizedPromptDetail";
import { OptimizePromptForm } from "./OptimizePromptForm";
import { ImproveOptimizedPromptForm } from "./ImproveOptimizedPromptForm";
import {
  ImproveOptimizedPromptFormValues,
  OptimizePromptFormErrorState,
  OptimizePromptFormValues,
  OptimizerSuccessResult,
} from "../types";
import { TargetExecutionModeKey } from "shared/types";

type OptimizationSession = {
  initialPrompt: string;
  targetMode: TargetExecutionModeKey;
  optimizedPrompt: string;
  clarifyingQuestions: string[];
};

type RequestRejectedResult = {
  ok: false;
  rejectReason: string;
};

type RequestSuccessResult = {
  ok: true;
};

type RequestResult<T extends RequestSuccessResult> = T | RequestRejectedResult;

type RunRequestOptions<T extends RequestSuccessResult> = {
  execute: () => Promise<RequestResult<T>>;
  onSuccess: (response: T) => void;
  inProgressTitle: string;
  successTitle: string;
  failureTitle: string;
  errorStateTitle?: string;
};

export const OptimizePromptCommand: React.FC = () => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [session, setSession] = useState<OptimizationSession | null>(null);
  const [errorState, setErrorState] = useState<OptimizePromptFormErrorState | null>(null);
  const [view, setView] = useState<"form" | "detail" | "clarify">("form");

  const runRequest = useCallback(async <T extends RequestSuccessResult>(options: RunRequestOptions<T>) => {
    setIsOptimizing(true);
    setErrorState(null);

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: options.inProgressTitle,
    });

    try {
      const response = await options.execute();

      if (!response.ok) {
        if (options.errorStateTitle) {
          setErrorState({
            message: response.rejectReason,
            title: options.errorStateTitle,
          });
        }

        toast.style = Toast.Style.Failure;
        toast.title = options.failureTitle;
        toast.message = response.rejectReason;
        return;
      }

      options.onSuccess(response);
      toast.style = Toast.Style.Success;
      toast.title = options.successTitle;
    } catch (error) {
      const info = toErrorInfo(error);
      if (options.errorStateTitle) {
        setErrorState({
          title: options.errorStateTitle,
          message: info.message,
          status: info.status,
        });
      }
      toast.style = Toast.Style.Failure;
      toast.title = options.failureTitle;
      toast.message = info.message;
    } finally {
      setIsOptimizing(false);
    }
  }, []);

  const handleOptimizePrompt = useCallback(
    async (values: OptimizePromptFormValues) => {
      if (!values.prompt.trim()) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Prompt is required",
        });
        return;
      }

      setSession(null);
      setView("form");

      await runRequest<OptimizerSuccessResult>({
        execute: () =>
          optimizePrompt({
            initialPrompt: values.prompt,
            targetMode: values.targetMode,
          }),
        onSuccess: (response) => {
          setSession({
            initialPrompt: values.prompt,
            targetMode: values.targetMode,
            optimizedPrompt: response.optimizedPrompt,
            clarifyingQuestions: response.clarifyingQuestions,
          });
          setView("detail");
        },
        inProgressTitle: "Optimizing...",
        successTitle: "Prompt optimized",
        failureTitle: "Optimization Failed",
        errorStateTitle: "Optimization Failed",
      });
    },
    [runRequest],
  );

  const handleImproveOptimizedPrompt = useCallback(
    async (values: ImproveOptimizedPromptFormValues) => {
      if (!session) {
        await showToast({ style: Toast.Style.Failure, title: "Missing optimization context" });
        return;
      }

      await runRequest<OptimizerSuccessResult>({
        execute: () =>
          improveOptimizedPrompt({
            initialPrompt: session.initialPrompt,
            targetMode: session.targetMode,
            currentOptimizedPrompt: session.optimizedPrompt,
            clarifications: values.clarifications,
          }),
        onSuccess: (response) => {
          setSession({
            ...session,
            optimizedPrompt: response.optimizedPrompt,
            clarifyingQuestions: response.clarifyingQuestions,
          });
          setView("detail");
        },
        inProgressTitle: "Improving prompt...",
        successTitle: "Prompt improved",
        failureTitle: "Improvement Failed",
      });
    },
    [session, runRequest],
  );

  const handleRetryOptimizePrompt = useCallback(async () => {
    if (!session) {
      await showToast({ style: Toast.Style.Failure, title: "Missing optimization context" });
      return;
    }

    await runRequest<OptimizerSuccessResult>({
      execute: () =>
        retryOptimizePrompt({
          initialPrompt: session.initialPrompt,
          targetMode: session.targetMode,
          currentOptimizedPrompt: session.optimizedPrompt,
        }),
      onSuccess: (response) => {
        setSession({
          ...session,
          optimizedPrompt: response.optimizedPrompt,
          clarifyingQuestions: response.clarifyingQuestions,
        });
        setView("detail");
      },
      inProgressTitle: "Retrying optimization...",
      successTitle: "Prompt optimized",
      failureTitle: "Optimization Failed",
    });
  }, [session, runRequest]);

  if (view === "clarify" && session) {
    return (
      <ImproveOptimizedPromptForm
        clarifyingQuestions={session.clarifyingQuestions}
        onBack={() => setView("detail")}
        onSubmit={handleImproveOptimizedPrompt}
      />
    );
  }

  if (session) {
    return (
      <OptimizedPromptDetail
        optimizedPrompt={session.optimizedPrompt}
        showImprovePromptAction={session.clarifyingQuestions.length > 0}
        onImprovePrompt={() => setView("clarify")}
        onRetry={handleRetryOptimizePrompt}
      />
    );
  }

  return <OptimizePromptForm isOptimizing={isOptimizing} errorState={errorState} onSubmit={handleOptimizePrompt} />;
};

function toErrorInfo(error: unknown): { status?: number; message: string } {
  if (error instanceof LLMProviderError) {
    return { status: error.status, message: error.message };
  }

  if (error instanceof Error) {
    return { message: error.message };
  }

  return { message: "API request failed" };
}
