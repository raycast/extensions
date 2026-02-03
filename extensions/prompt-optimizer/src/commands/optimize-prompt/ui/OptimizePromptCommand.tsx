import React, { useCallback, useState } from "react";
import { Toast, showToast } from "@raycast/api";
import { improveOptimizedPrompt, optimizePrompt, retryOptimizePrompt } from "../lib/optimize-prompt";
import { OptimizedPromptDetail } from "./OptimizedPromptDetail";
import { OptimizePromptForm } from "./OptimizePromptForm";
import { ImproveOptimizedPromptForm } from "./ImproveOptimizedPromptForm";
import { useLLMRequest } from "shared/hooks/useLLMRequest";
import { ImproveOptimizedPromptFormValues, OptimizePromptFormValues, OptimizerSuccessResult } from "../types";
import { TargetExecutionModeKey } from "shared/types";

type OptimizationSession = {
  initialPrompt: string;
  targetMode: TargetExecutionModeKey;
  optimizedPrompt: string;
  clarifyingQuestions: string[];
};

export const OptimizePromptCommand: React.FC = () => {
  const [session, setSession] = useState<OptimizationSession | null>(null);
  const [view, setView] = useState<"form" | "detail" | "clarify">("form");
  const { isLoading, errorState, runRequest } = useLLMRequest();

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
        execute: async () => {
          const response = await optimizePrompt({
            initialPrompt: values.prompt,
            targetMode: values.targetMode,
          });
          if (!response.ok) {
            throw new Error(response.rejectReason);
          }
          return response;
        },
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
        execute: async () => {
          const response = await improveOptimizedPrompt({
            initialPrompt: session.initialPrompt,
            targetMode: session.targetMode,
            currentOptimizedPrompt: session.optimizedPrompt,
            clarifications: values.clarifications,
          });
          if (!response.ok) {
            throw new Error(response.rejectReason);
          }
          return response;
        },
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
      execute: async () => {
        const response = await retryOptimizePrompt({
          initialPrompt: session.initialPrompt,
          targetMode: session.targetMode,
          currentOptimizedPrompt: session.optimizedPrompt,
        });
        if (!response.ok) {
          throw new Error(response.rejectReason);
        }
        return response;
      },
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

  return <OptimizePromptForm isOptimizing={isLoading} errorState={errorState} onSubmit={handleOptimizePrompt} />;
};
