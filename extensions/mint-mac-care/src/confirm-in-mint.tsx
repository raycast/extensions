import { Action, ActionPanel, Color, Detail, Icon, List, Toast, showToast } from "@raycast/api";
import { useState } from "react";
import { openMint } from "./mint-cli";
import { notApprovedText, runParity } from "./mint-parity";
import type { NotRun, ParityRequest } from "./mint-parity";
import { newProgressToken } from "./use-progress";
import type { PlanWallPush } from "./plan-wall";
import type { PlanGate } from "./mint-plan";

/**
 * A Mint too old for a command that Mint confirms in its own window: one line
 * asking for the update (the extension ships through Raycast's store, apart
 * from Mint's own updates).
 */
export function NeedsNewerMint({ command }: { command: string }) {
  return (
    <Detail
      markdown={`## Update Mint to use ${command}

${command} needs Mint 1.2 or later, where Mint asks in its own window before it changes anything. Open Mint and choose **Check for Updates**, then come back.`}
      actions={
        <ActionPanel>
          <Action title="Open Mint" icon={Icon.AppWindow} onAction={openMint} />
        </ActionPanel>
      }
    />
  );
}

/**
 * Sends a change Mint confirms in its own window. Raycast never approves it:
 * `confirmed` only says the person asked for this exact request; Mint shows
 * the full list and waits for its own button. Answers undefined when Mint's
 * window did not approve or Mint could not run it, after saying so.
 */
export async function runConfirmedInMint<T extends object>(
  cli: string,
  request: ParityRequest,
  words: {
    done: (result: T & NotRun) => string;
    failed: string;
    /** Whether Mint held part of this back for the week's free allowance. */
    held?: (result: T & NotRun) => boolean;
    /** Which plan refusal this request can meet (default: the week's gate). */
    gate?: PlanGate;
    /** What each item Mint left as it was asked of the week (`keptSizes`): the wall when the week held one. */
    kept?: (result: T & NotRun) => number[];
  },
  /** The plan wall (2026-11-10): shown when the week held something back or refused the run. */
  wall?: PlanWallPush,
): Promise<(T & NotRun) | undefined> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Confirm in Mint",
    message: "Mint shows the full list in its own window.",
  });
  try {
    const result = await runParity<T & NotRun>(cli, { ...request, confirmed: true, progressToken: newProgressToken() });
    const refused = notApprovedText(result);
    if (refused) {
      toast.style = Toast.Style.Failure;
      toast.title = refused;
      toast.message = undefined;
      return undefined;
    }
    toast.style = Toast.Style.Success;
    toast.title = words.done(result);
    toast.message = undefined;
    if (wall && words.held?.(result)) wall.held();
    else if (wall && words.kept && leftSomething(result)) await wall.keptBack(words.kept(result));
    return result;
  } catch (error) {
    if (wall && (await wall.refused(undefined, words.gate))) {
      await toast.hide();
      return undefined;
    }
    toast.style = Toast.Style.Failure;
    toast.title = words.failed;
    toast.message = error instanceof Error ? error.message : String(error);
    return undefined;
  }
}

/** Whether Mint's answer left any of the request as it was. */
function leftSomething(result: object): boolean {
  const answer = result as { failures?: unknown; failedCount?: number };
  return (Array.isArray(answer.failures) && answer.failures.length > 0) || (answer.failedCount ?? 0) > 0;
}

/** For a view whose read failed: look again, or open Mint. */
export function RetryActions({ onRetry }: { onRetry: () => void }) {
  return (
    <ActionPanel>
      <Action title="Retry" icon={Icon.ArrowClockwise} onAction={onRetry} />
      <Action title="Open Mint" icon={Icon.AppWindow} onAction={openMint} />
    </ActionPanel>
  );
}

/** Rows the person ticks one by one, as Free Disk's chooser does. */
export function useChosen() {
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setChosen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  return { chosen, toggle, setChosen, clear: () => setChosen(new Set()) };
}

export function chosenAccessory(isChosen: boolean): List.Item.Accessory {
  return {
    icon: {
      source: isChosen ? Icon.CheckCircle : Icon.Circle,
      tintColor: isChosen ? Color.PrimaryText : Color.SecondaryText,
    },
  };
}
