import { closeMainWindow, Clipboard, LaunchType, launchCommand, showToast, Toast } from "@raycast/api";
import type { ExecutionContext } from "./executionContext";
import { runPrompt } from "./ai";
import { displayErrorToast } from "./error";
import { logger } from "./logger";
import { outputResult } from "./output";
import { PromptEvent } from "./promptEvents";
import {
  createPendingProgress,
  formatPendingTitle,
  getInitialPendingPhase,
  PendingPhase,
  renderInlinePendingState,
  renderPanelPendingState,
} from "./pendingPresentation";
import { createAbortError, isAbortLikeError } from "./requestErrors";

export type ExecutePromptResult = { status: "success"; result: string } | { status: "empty" } | { status: "aborted" };

type ExecutePromptOptions = {
  prompt: string;
  input: string;
  context: ExecutionContext;
  signal?: AbortSignal;
  onUpdate?: (update: PromptEvent) => void;
};

type RunInlineFlowOptions = {
  prompt: string;
  input: string;
  title: string;
  context: ExecutionContext;
  signal?: AbortSignal;
};

type RunPanelFlowOptions = {
  prompt: string;
  input: string;
  title?: string;
  context: ExecutionContext;
  signal?: AbortSignal;
  onResultChange?: (result: string | null) => void;
  onStatusChange?: (title: string) => void;
};

type FlowResult = ExecutePromptResult | { status: "error" };

export async function executePrompt({
  prompt,
  input,
  context,
  signal,
  onUpdate,
}: ExecutePromptOptions): Promise<ExecutePromptResult> {
  if (signal?.aborted) {
    return { status: "aborted" };
  }

  try {
    const result = await runPrompt({
      prompt,
      input,
      settings: context.settings,
      onUpdate: (event) => {
        if (signal?.aborted) {
          throw createAbortError();
        }

        if ("text" in event && event.text === "_NO_CONTENT_") {
          return;
        }

        onUpdate?.(event);
      },
      signal,
      personalContext: context.personalContext,
    });

    if (signal?.aborted) {
      return { status: "aborted" };
    }

    const normalizedResult = result.trim();

    if (normalizedResult === "_NO_CONTENT_") {
      return { status: "empty" };
    }

    if (normalizedResult.length === 0) {
      throw new Error("Model returned an empty response.");
    }

    return { status: "success", result };
  } catch (error) {
    if (isAbortError(error)) {
      return { status: "aborted" };
    }
    throw error;
  }
}

export async function runInlineFlow({
  prompt,
  input,
  title,
  context,
  signal,
}: RunInlineFlowOptions): Promise<FlowResult> {
  await closeMainWindow();

  const toast = await showToast({
    style: Toast.Style.Animated,
    title,
    message: "Processing…",
  });
  let pendingProgress: ReturnType<typeof createPendingProgress> | null = null;

  try {
    await delay(50);

    let hasStartedContent = false;
    let latestReasoning = "";
    let currentPhase: PendingPhase = getInitialPendingPhase(context.settings.aiProvider);

    const progress = createPendingProgress((elapsedSeconds) => {
      if (hasStartedContent) return;
      renderInlinePendingState({
        aiProvider: context.settings.aiProvider,
        commandTitle: title,
        toast,
        elapsedSeconds,
        phase: currentPhase,
        reasoning: latestReasoning,
      });
    });
    pendingProgress = progress;

    renderInlinePendingState({
      aiProvider: context.settings.aiProvider,
      commandTitle: title,
      toast,
      elapsedSeconds: 1,
      phase: currentPhase,
      reasoning: latestReasoning,
    });

    const execution = await executePrompt({
      prompt,
      input,
      context,
      signal,
      onUpdate: (update) => {
        if (update.kind === "phase") {
          if (!hasStartedContent && currentPhase !== "thinking") {
            currentPhase = update.phase;
            renderInlinePendingState({
              aiProvider: context.settings.aiProvider,
              commandTitle: title,
              toast,
              elapsedSeconds: progress.getElapsedSeconds(),
              phase: currentPhase,
              reasoning: latestReasoning,
            });
          }
          return;
        }

        if (update.kind === "reasoning") {
          currentPhase = "thinking";
          latestReasoning = update.text;
          renderInlinePendingState({
            aiProvider: context.settings.aiProvider,
            commandTitle: title,
            toast,
            elapsedSeconds: progress.getElapsedSeconds(),
            phase: currentPhase,
            reasoning: latestReasoning,
          });
          return;
        }

        if (!hasStartedContent) {
          hasStartedContent = true;
          progress.stop();
          toast.title = "Generating...";
        }

        const flatText = update.text.replace(/\n/g, " ").replace(/\s+/g, " ");
        const displayLength = 25;
        const codePoints = [...flatText];
        toast.title = codePoints.length > displayLength ? codePoints.slice(-displayLength).join("") : flatText;
        toast.message = "";
      },
    });

    if (execution.status === "aborted") {
      await toast.hide();
      return execution;
    }

    if (execution.status === "empty") {
      toast.style = Toast.Style.Failure;
      toast.title = "No text selected";
      toast.message = "";
      return execution;
    }

    const output = await outputResult(execution.result, input, signal);
    logger.log(`[runInlineFlow] Output status: ${output}`);

    if (signal?.aborted) {
      await toast.hide();
      return { status: "aborted" };
    }

    if (output === "pasted") {
      toast.style = Toast.Style.Success;
      toast.title = title;
      toast.message = "";
      return execution;
    }

    logger.log("[runInlineFlow] Paste failed, falling back to panel mode.");
    if (signal?.aborted) {
      await toast.hide();
      return { status: "aborted" };
    }
    await Clipboard.copy(execution.result);
    await toast.hide();
    await launchCommand({
      name: "ai-command",
      type: LaunchType.UserInitiated,
      context: { result: execution.result },
    });

    return execution;
  } catch (error) {
    if (isAbortLikeError(error)) {
      await toast.hide();
      return { status: "aborted" };
    }
    logger.logErrorDetail("[runInlineFlow]", error);
    const errorToast = await showToast({
      style: Toast.Style.Failure,
      title: "Error",
    });
    displayErrorToast(errorToast, error);
    return { status: "error" };
  } finally {
    pendingProgress?.stop();
  }
}

export async function runPanelFlow({
  prompt,
  input,
  title,
  context,
  signal,
  onResultChange,
  onStatusChange,
}: RunPanelFlowOptions): Promise<FlowResult> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: title || "Processing…",
  });
  let pendingProgress: ReturnType<typeof createPendingProgress> | null = null;

  try {
    let hasStartedContent = false;
    let lastUpdateTime = 0;
    let latestReasoning = "";
    let currentPhase: PendingPhase = getInitialPendingPhase(context.settings.aiProvider);
    const usesStaticWaitingPlaceholder = context.settings.aiProvider === "raycast";

    renderPanelPendingState({
      elapsedSeconds: 1,
      onResultChange,
      phase: currentPhase,
      reasoning: latestReasoning,
      usesStaticWaitingPlaceholder,
    });
    onStatusChange?.(formatPendingTitle(currentPhase, 1));

    const progress = createPendingProgress((elapsedSeconds) => {
      if (hasStartedContent) return;
      const statusTitle = formatPendingTitle(currentPhase, elapsedSeconds);
      toast.title = statusTitle;
      onStatusChange?.(statusTitle);
      renderPanelPendingState({
        elapsedSeconds,
        onResultChange,
        phase: currentPhase,
        reasoning: latestReasoning,
        usesStaticWaitingPlaceholder,
      });
    });
    pendingProgress = progress;

    const execution = await executePrompt({
      prompt,
      input,
      context,
      signal,
      onUpdate: (update) => {
        if (update.kind === "phase") {
          if (!hasStartedContent && currentPhase !== "thinking") {
            currentPhase = update.phase;
            onStatusChange?.(formatPendingTitle(currentPhase, progress.getElapsedSeconds()));
            renderPanelPendingState({
              elapsedSeconds: progress.getElapsedSeconds(),
              onResultChange,
              phase: currentPhase,
              reasoning: latestReasoning,
              usesStaticWaitingPlaceholder,
            });
          }
          return;
        }

        if (update.kind === "content" && !hasStartedContent && update.text.trim().length > 0) {
          hasStartedContent = true;
          latestReasoning = "";
          progress.stop();
        }

        if (update.kind === "reasoning") {
          currentPhase = "thinking";
          latestReasoning = update.text;
          const elapsedSeconds = progress.getElapsedSeconds();
          const statusTitle = formatPendingTitle(currentPhase, elapsedSeconds);
          toast.title = statusTitle;
          onStatusChange?.(statusTitle);
          renderPanelPendingState({
            elapsedSeconds,
            onResultChange,
            phase: currentPhase,
            reasoning: latestReasoning,
            usesStaticWaitingPlaceholder,
          });
          return;
        }

        if (toast.title !== "Generating...") {
          toast.title = "Generating...";
          onStatusChange?.("Generating...");
        }

        const now = Date.now();
        if (now - lastUpdateTime > 60 || update.text.length < 50 || !hasStartedContent) {
          onResultChange?.(update.text);
          lastUpdateTime = now;
        }
      },
    });

    if (execution.status === "aborted") {
      await toast.hide();
      return execution;
    }

    if (execution.status === "empty") {
      onResultChange?.(null);
      onStatusChange?.("No text selected");
      toast.style = Toast.Style.Failure;
      toast.title = "No text selected";
      toast.message = "";
      return execution;
    }

    await toast.hide();
    onStatusChange?.(title || "Done");
    onResultChange?.(execution.result);

    return execution;
  } catch (error) {
    if (isAbortLikeError(error)) {
      await toast.hide();
      return { status: "aborted" };
    }
    displayErrorToast(await showToast({ style: Toast.Style.Failure, title: "Error" }), error);
    return { status: "error" };
  } finally {
    pendingProgress?.stop();
  }
}

function isAbortError(error: unknown): boolean {
  return isAbortLikeError(error);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
