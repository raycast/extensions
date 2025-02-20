/**
 * Hook for executing Harmony commands with memoization.
 * Provides command execution with retry logic and error handling.
 * @module
 */

import { getPreferenceValues } from "@raycast/api";
import { useCallback, useState } from "react";

import { ToastManager } from "../services/toast";
import { HarmonyError, ErrorCategory } from "../types/core/errors";
import { HarmonyCommand } from "../types/core/harmony";
import { Preferences } from "../types/preferences";

import { useHarmony } from "./useHarmony";

/**
 * State interface for command execution.
 * Tracks execution state and statistics.
 * @interface CommandExecutionState
 */
interface CommandExecutionState {
  /** Whether a command is currently executing */
  isExecuting: boolean;
  /** Last executed command */
  lastCommand: HarmonyCommand | null;
  /** Last execution error */
  error: HarmonyError | null;
}

/**
 * Result interface for command execution hook.
 * Contains execution functions and state.
 * @interface CommandExecutionResult
 */
interface CommandExecutionResult {
  /** Execute a command with retry logic
   * @param command - Command to execute
   */
  execute: (command: HarmonyCommand) => Promise<void>;
  /** Retry the last failed command */
  retry: () => Promise<void>;
  /** Whether a command is currently executing */
  isExecuting: boolean;
  /** Last executed command */
  lastCommand: HarmonyCommand | null;
  /** Last execution error */
  error: HarmonyError | null;
}

/**
 * Hook for executing commands with retry and error handling.
 * Provides automatic retry based on preferences.
 * Shows toast notifications for execution status.
 * @returns CommandExecutionResult containing execution functions and state
 */
export function useCommandExecution(): CommandExecutionResult {
  const { executeCommand } = useHarmony();
  const [state] = useState<CommandExecutionState>({
    isExecuting: false,
    lastCommand: null,
    error: null,
  });

  const preferences = getPreferenceValues<Preferences>();
  const holdTime = parseInt(preferences.commandHoldTime, 10);
  const autoRetry = preferences.autoRetry;
  const maxRetries = parseInt(preferences.maxRetries, 10);

  /**
   * Execute a command with retry logic.
   * Retries failed commands based on preferences.
   * Shows toast notifications for status.
   * @param command - Command to execute
   */
  const execute = useCallback(
    async (command: HarmonyCommand) => {
      try {
        let retries = 0;
        let success = false;

        while (!success && retries <= maxRetries) {
          try {
            await executeCommand(command);
            success = true;
          } catch (error) {
            retries++;
            if (!autoRetry || retries > maxRetries) {
              throw error;
            }
            // Wait before retrying
            await new Promise((resolve) => setTimeout(resolve, holdTime));
          }
        }

        ToastManager.success(`Executed ${command.label}`);
      } catch (error) {
        const harmonyError = new HarmonyError(
          `Failed to execute ${command.label}`,
          ErrorCategory.COMMAND_EXECUTION,
          error instanceof Error ? error : undefined,
        );

        ToastManager.error(`Failed to execute ${command.label}`, harmonyError.message);
      }
    },
    [executeCommand, holdTime, autoRetry, maxRetries],
  );

  /**
   * Retry the last failed command.
   * Only works if there is a last command.
   */
  const retry = useCallback(async () => {
    if (state.lastCommand) {
      await execute(state.lastCommand);
    }
  }, [execute, state.lastCommand]);

  return {
    execute,
    retry,
    isExecuting: state.isExecuting,
    lastCommand: state.lastCommand,
    error: state.error,
  };
}
