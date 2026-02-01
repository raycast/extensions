import React, { useCallback, useState } from "react";
import { Toast, getPreferenceValues, showToast } from "@raycast/api";
import { toOpenAIErrorInfo } from "shared/lib/openapi";
import { improveOptimizedPrompt, optimizePrompt, retryOptimizePrompt } from "../lib/optimize-prompt";
import { MissingApiKeyView } from "./MissingApiKeyView";
import { OptimizedPromptDetail } from "./OptimizedPromptDetail";
import { OptimizePromptForm } from "./OptimizePromptForm";
import { ImproveOptimizedPromptForm } from "./ImproveOptimizedPromptForm";
import {
  ImproveOptimizedPromptFormValues,
  OptimizePromptFormErrorState,
  OptimizePromptFormValues,
  OptimizerSuccessResult,
} from "../types";
import { TargetModeKey } from "shared/types";

type Preferences = {
  openaiApiKey?: string;
  saveHistory?: boolean;
};

type OptimizationSession = {
  initialPrompt: string;
  targetMode: TargetModeKey;
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
  const preferences = getPreferenceValues<Preferences>();
  const apiKey = preferences.openaiApiKey?.trim() ?? "";

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
      const info = toOpenAIErrorInfo(error);
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

      if (!apiKey) {
        setErrorState({
          title: "OpenAI API Key Required",
          message: "Add your OpenAI API key in the extension preferences to start optimizing prompts.",
        });
        return;
      }

      setSession(null);
      setView("form");

      await runRequest<OptimizerSuccessResult>({
        execute: () =>
          optimizePrompt({
            apiKey,
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
    [apiKey, runRequest],
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
            apiKey,
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
    [apiKey, session, runRequest],
  );

  const handleRetryOptimizePrompt = useCallback(async () => {
    if (!session) {
      await showToast({ style: Toast.Style.Failure, title: "Missing optimization context" });
      return;
    }

    await runRequest<OptimizerSuccessResult>({
      execute: () =>
        retryOptimizePrompt({
          apiKey,
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
  }, [apiKey, session, runRequest]);

  if (!apiKey) {
    return <MissingApiKeyView />;
  }

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
