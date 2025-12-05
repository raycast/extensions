/**
 * Upgrade command for upgrading all brew packages with progress display.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Action, ActionPanel, Color, Icon, List, showToast, Toast, popToRoot } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";
import { brewUpgradeWithProgress, preferences, showFailureToast, actionsLogger } from "../utils";
import { ErrorBoundary } from "../components/ErrorBoundary";
import type { UpgradeStep } from "../utils/brew/upgrade";

/**
 * Get the icon for a step based on its status.
 */
function getStepIcon(step: UpgradeStep): { source: Icon; tintColor?: Color } | ReturnType<typeof getProgressIcon> {
  switch (step.status) {
    case "pending":
      return { source: Icon.Circle, tintColor: Color.SecondaryText };
    case "running":
      return getProgressIcon(0.5);
    case "completed":
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    case "failed":
      // Use warning icon for recoverable errors
      if (step.isRecoverable) {
        return { source: Icon.ExclamationMark, tintColor: Color.Orange };
      }
      return { source: Icon.XMarkCircle, tintColor: Color.Red };
    case "skipped":
      return { source: Icon.MinusCircle, tintColor: Color.SecondaryText };
  }
}

/**
 * Format duration in a human-readable way.
 */
function formatDuration(startTime?: number, endTime?: number): string | undefined {
  if (!startTime) return undefined;
  const end = endTime || Date.now();
  const durationMs = end - startTime;
  if (durationMs < 1000) return `${durationMs}ms`;
  const seconds = Math.floor(durationMs / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Calculate overall progress percentage.
 */
function calculateProgress(steps: UpgradeStep[]): number {
  if (steps.length === 0) return 0;
  const completed = steps.filter(
    (s) => s.status === "completed" || s.status === "skipped" || s.status === "failed",
  ).length;
  return completed / steps.length;
}

function UpgradeViewContent() {
  const [steps, setSteps] = useState<UpgradeStep[]>([]);
  const [isRunning, setIsRunning] = useState(true);
  const [currentOutput, setCurrentOutput] = useState<string>("");
  const [error, setError] = useState<Error | undefined>();
  const [wasCancelled, setWasCancelled] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasStartedRef = useRef(false);
  const isMountedRef = useRef(true);

  const handleProgress = useCallback((newSteps: UpgradeStep[], output?: string) => {
    if (!isMountedRef.current) return;
    setSteps([...newSteps]);
    if (output) {
      setCurrentOutput(output);
    }
    actionsLogger.log("Upgrade progress", {
      completedSteps: newSteps.filter((s) => s.status === "completed").length,
      totalSteps: newSteps.length,
    });
  }, []);

  const runUpgrade = useCallback(async () => {
    if (hasStartedRef.current) {
      actionsLogger.log("Upgrade already started, skipping duplicate call");
      return;
    }
    hasStartedRef.current = true;
    actionsLogger.log("Starting upgrade process");

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Upgrading packages...",
    });

    try {
      const result = await brewUpgradeWithProgress(preferences.greedyUpgrades, handleProgress, controller);

      if (result.success) {
        const completedCount = result.steps.filter((s) => s.status === "completed").length;
        const skippedCount = result.steps.filter((s) => s.status === "skipped").length;

        if (skippedCount > 0 && completedCount <= 2) {
          toast.style = Toast.Style.Success;
          toast.title = "All packages up to date";
        } else {
          toast.style = Toast.Style.Success;
          toast.title = `Upgraded ${completedCount - 2} package${completedCount - 2 === 1 ? "" : "s"}`;
        }
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = "Upgrade failed";
        toast.message = result.error?.message;
        setError(result.error);
      }
    } catch (err) {
      const error = err as Error;
      actionsLogger.error("Upgrade caught exception", {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });

      if (error.name === "AbortError") {
        toast.style = Toast.Style.Failure;
        toast.title = "Upgrade cancelled";
        setWasCancelled(true);
        // Log cancellation with current state (steps is captured in closure)
        actionsLogger.log("Upgrade cancelled by user", {
          completedSteps: steps.filter((s) => s.status === "completed").length,
          runningStep: steps.find((s) => s.status === "running")?.title,
          pendingSteps: steps.filter((s) => s.status === "pending").length,
          totalSteps: steps.length,
        });
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = "Upgrade failed";
        toast.message = error.message;
        setError(error);
        await showFailureToast("Upgrade failed", error);
      }
    } finally {
      setIsRunning(false);
      abortControllerRef.current = null;
    }
  }, [handleProgress]);

  useEffect(() => {
    isMountedRef.current = true;
    actionsLogger.log("UpgradeView mounted");
    runUpgrade();

    return () => {
      actionsLogger.log("UpgradeView cleanup called");
      isMountedRef.current = false;
      // Don't abort on cleanup - let the process complete
      // User can manually cancel if needed
    };
  }, [runUpgrade]);

  const handleCancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const progress = calculateProgress(steps);
  const runningStep = steps.find((s) => s.status === "running");
  const completedCount = steps.filter((s) => s.status === "completed").length;
  const failedCount = steps.filter((s) => s.status === "failed").length;
  const recoverableCount = steps.filter((s) => s.status === "failed" && s.isRecoverable).length;

  // Count skipped steps (for cancelled detection)
  const skippedCount = steps.filter((s) => s.status === "skipped").length;
  const cancelledStepCount = steps.filter((s) => s.message === "Cancelled by user" || s.message === "Cancelled").length;
  const isCancelledState = wasCancelled || cancelledStepCount > 0;

  // Determine navigation title based on state
  let navigationTitle = "Upgrading...";
  if (!isRunning) {
    if (isCancelledState) {
      navigationTitle = "Upgrade Cancelled";
    } else if (error || failedCount > 0) {
      navigationTitle = "Upgrade Failed";
    } else {
      navigationTitle = "Upgrade Complete";
    }
  } else if (runningStep) {
    navigationTitle = `Upgrading ${runningStep.title}...`;
  }

  return (
    <List
      isLoading={isRunning && steps.length === 0}
      navigationTitle={navigationTitle}
      searchBarPlaceholder="Upgrade progress"
    >
      {steps.length === 0 && isRunning && (
        <List.EmptyView
          icon={getProgressIcon(0.1)}
          title="Preparing upgrade..."
          description="Checking for outdated packages"
        />
      )}

      {steps.length > 0 && (
        <>
          <List.Section title="Progress" subtitle={`${Math.round(progress * 100)}% complete`}>
            {steps.map((step) => (
              <List.Item
                key={step.id}
                icon={getStepIcon(step)}
                title={step.title}
                subtitle={step.subtitle}
                accessories={[
                  // Show current phase for running steps
                  ...(step.status === "running" && step.currentPhase
                    ? [
                        {
                          tag: { value: step.currentPhase, color: Color.Blue },
                          tooltip: `Current phase: ${step.currentPhase}`,
                        },
                      ]
                    : []),
                  // Show message (use "Cancelled" instead of "Aborted" for abort errors)
                  ...(step.message
                    ? [
                        {
                          text: step.message === "Aborted" ? "Cancelled" : step.message,
                          tooltip: step.message === "Aborted" ? "Cancelled by user" : step.message,
                        },
                      ]
                    : []),
                  // Show recoverable indicator for failed steps
                  ...(step.status === "failed" && step.isRecoverable
                    ? [
                        {
                          tag: { value: "Retry", color: Color.Orange },
                          tooltip: "This error may be resolved by retrying",
                        },
                      ]
                    : []),
                  // Show duration
                  ...(step.status === "running" || step.status === "completed" || step.status === "failed"
                    ? [{ text: formatDuration(step.startTime, step.endTime), tooltip: "Duration" }]
                    : []),
                ]}
                actions={
                  <ActionPanel>
                    {isRunning && (
                      <Action
                        title="Cancel Upgrade"
                        icon={Icon.XMarkCircle}
                        style={Action.Style.Destructive}
                        onAction={handleCancel}
                      />
                    )}
                    {!isRunning && <Action title="Close" icon={Icon.ArrowLeft} onAction={() => popToRoot()} />}
                    {currentOutput && (
                      <Action.CopyToClipboard
                        title="Copy Output Log"
                        content={currentOutput}
                        shortcut={{ modifiers: ["cmd"], key: "l" }}
                      />
                    )}
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>

          {!isRunning && (
            <List.Section title="Summary">
              {/* Show upgraded packages */}
              {steps
                .filter((s) => s.status === "completed" && (s.id.startsWith("formula-") || s.id.startsWith("cask-")))
                .map((step) => (
                  <List.Item
                    key={`summary-${step.id}`}
                    icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
                    title={step.title}
                    subtitle={step.subtitle}
                    accessories={[
                      { text: "Upgraded", tooltip: `Upgraded in ${formatDuration(step.startTime, step.endTime)}` },
                    ]}
                  />
                ))}
              {/* Show failed packages */}
              {steps
                .filter((s) => s.status === "failed" && (s.id.startsWith("formula-") || s.id.startsWith("cask-")))
                .map((step) => (
                  <List.Item
                    key={`summary-${step.id}`}
                    icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
                    title={step.title}
                    subtitle={step.subtitle}
                    accessories={[{ text: step.message || "Failed", tooltip: step.message }]}
                  />
                ))}
              {/* Show totals if there were packages */}
              {(completedCount > 2 || failedCount > 0 || isCancelledState) && (
                <List.Item
                  icon={{
                    source: isCancelledState ? Icon.XMarkCircle : Icon.Document,
                    tintColor: isCancelledState ? Color.Orange : Color.SecondaryText,
                  }}
                  title="Total"
                  accessories={[
                    // Show upgraded count only if we actually upgraded packages (completedCount > 2 means more than just update+check)
                    ...(completedCount > 2
                      ? [{ text: `${completedCount - 2} upgraded`, tooltip: "Packages upgraded" }]
                      : []),
                    // Show cancelled info if cancelled
                    ...(isCancelledState
                      ? [
                          {
                            text:
                              cancelledStepCount > 0
                                ? `${cancelledStepCount} cancelled`
                                : skippedCount > 0
                                  ? `${skippedCount} skipped`
                                  : "Cancelled",
                            tooltip: "Upgrade was cancelled by user",
                          },
                        ]
                      : []),
                    // Show failed count (excluding cancellation-related failures)
                    ...(failedCount > 0 && !isCancelledState
                      ? [
                          {
                            text: `${failedCount} failed${recoverableCount > 0 ? ` (${recoverableCount} retryable)` : ""}`,
                            tooltip:
                              recoverableCount > 0 ? "Some failures may be resolved by retrying" : "Packages failed",
                          },
                        ]
                      : []),
                  ]}
                />
              )}
              {/* Show message when nothing to upgrade (only if not cancelled) */}
              {completedCount <= 2 && failedCount === 0 && !isCancelledState && (
                <List.Item
                  icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
                  title="All packages are up to date"
                  subtitle="No upgrades needed"
                />
              )}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}

export default function UpgradeView() {
  return (
    <ErrorBoundary>
      <UpgradeViewContent />
    </ErrorBoundary>
  );
}
