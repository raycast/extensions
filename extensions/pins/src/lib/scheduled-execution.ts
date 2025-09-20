/**
 * @module lib/scheduled-execution.ts A collection of functions for managing scheduled executions, i.e. delayed evaluation of pin targets and placeholders.
 *
 * @summary Utilities for carrying out scheduled/delayed execution of pins and placeholders.
 * @author Stephen Kaplan <skaplanofficial@gmail.com>
 *
 * Created at     : 2023-09-03 12:37:46
 * Last modified  : 2024-01-13 01:04:51
 */

import { environment, showHUD, showToast } from "@raycast/api";

import { StorageKey } from "./constants";
import { getStorage, setStorage } from "./storage";
import { PLApplicator } from "placeholders-toolkit";
import PinsPlaceholders from "./placeholders";

/**
 * A scheduled execution of a placeholder. These are stored in the extension's persistent local storage.
 */
export interface DelayedExecution {
  /**
   * The pin target to evaluate.
   */
  target: string;

  /**
   * The date and time at which the evaluation should occur.
   */
  dueDate: Date;
}

/**
 * Schedules content to be evaluated by the placeholder system at a later date.
 * @param target The content to evaluate.
 * @param dueDate The date and time at which the content should be evaluated.
 */
export const scheduleTargetEvaluation = async (target: string, dueDate: Date) => {
  const delayedExecutions = await getStorage(StorageKey.DELAYED_EXECUTIONS);
  delayedExecutions.push({ target: target, dueDate: dueDate });
  await setStorage(StorageKey.DELAYED_EXECUTIONS, delayedExecutions);

  if (environment.commandName == "index") {
    await showHUD("Scheduled Delayed Evaluation");
  } else {
    await showToast({
      title: "Scheduled Delayed Evaluation",
      primaryAction: {
        title: "Cancel",
        onAction: async () => {
          await removedScheduledEvaluation(target, dueDate);
          await showToast({ title: "Canceled Delayed Evaluation" });
        },
      },
    });
  }
};

/**
 * Cancels a schedules evaluation, removing it from the extension's persistent local storage.
 * @param target The content of the evaluation to cancel.
 * @param dueDate The date and time at which the evaluation was scheduled to occur.
 */
export const removedScheduledEvaluation = async (target: string, dueDate: Date) => {
  const delayedExecutions: { target: string; dueDate: string }[] = await getStorage(StorageKey.DELAYED_EXECUTIONS);
  await setStorage(
    StorageKey.DELAYED_EXECUTIONS,
    delayedExecutions.filter((execution) => execution.target != target && new Date(execution.dueDate) != dueDate),
  );
};

/**
 * Checks if any scheduled executions are due to be evaluated, and evaluates them if they are.
 */
export const checkDelayedExecutions = async () => {
  const delayedExecutions: { target: string; dueDate: string }[] = await getStorage(StorageKey.DELAYED_EXECUTIONS);
  const now = new Date();
  for (const execution of delayedExecutions) {
    if (new Date(execution.dueDate) <= now) {
      await PLApplicator.applyToString(execution.target, { allPlaceholders: PinsPlaceholders });
    }
  }
  await setStorage(
    StorageKey.DELAYED_EXECUTIONS,
    delayedExecutions.filter((execution) => new Date(execution.dueDate) > now),
  );
};
