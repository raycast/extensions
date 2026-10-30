import { showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { FRAME_MS } from "../art";
import { SKILL_BY_ID } from "../engine/data";
import { formatBundle } from "../engine/format";
import { clearAway } from "../engine/away";
import { emptyReport, mergeReports } from "../engine/report";
import { update } from "../engine/storage";
import { GameState, Report } from "../engine/types";

/** What a tick found. `seen` is what accrued while the window was closed, on the first tick only. */
export interface TickInfo {
  state: GameState;
  report: Report;
  seen?: Report;
}

export interface Game {
  state?: GameState;
  /** Counts up for art animation. */
  frame: number;
  /** Runs a change against the saved game and refreshes the screen. */
  sync: (change?: (s: GameState) => GameState) => Promise<void>;
  /** Like `sync`, with a toast for the result (or its error). */
  act: <R extends { state: GameState; error?: string }>(
    change: (s: GameState) => R,
    success?: (result: R) => string,
  ) => Promise<void>;
}

/** A game screen with its state loaded, for views that render only once there is one. */
export type ReadyGame = Game & { state: GameState };

export function showReport(report: Report) {
  const found = Object.keys(report.rare).length > 0;
  const lines = [
    ...report.levelUps.map((u) => `${SKILL_BY_ID[u.skill].name} ${u.level}`),
    ...report.bounties.map((b) => `Bounty for ${b.poster}: +${b.marks} Marks`),
    ...(found ? [`Rare find: ${formatBundle(report.rare)}`] : []),
    ...report.notices,
    report.stoppedReason,
  ].filter(Boolean);
  const title = report.stoppedReason
    ? "Task stopped"
    : report.levelUps.length
      ? "Level up!"
      : report.bounties.length
        ? "Bounty complete"
        : found
          ? "Rare find!"
          : report.notices.length
            ? "Contact"
            : report.completed;
  if (!title) return;
  showToast({
    style: report.stoppedReason ? Toast.Style.Failure : Toast.Style.Success,
    title,
    message: lines.join(" · ") || undefined,
  });
}

/**
 * Loads the game and keeps it ticking while the screen is open. Every screen calls this itself,
 * because a pushed view cannot see the state of the screen that opened it. The root screen passes
 * `onTick` to handle what the others skip: time away, tips and the toasts that go with them.
 */
export function useGame(onTick?: (info: TickInfo) => void | Promise<void>): Game {
  const [state, setState] = useState<GameState>();
  const [frame, setFrame] = useState(0);

  async function sync(change?: (s: GameState) => GameState) {
    const { state, report } = await update(change);
    setState(state);
    showReport(report);
  }

  async function act<R extends { state: GameState; error?: string }>(
    change: (s: GameState) => R,
    success?: (result: R) => string,
  ) {
    let result = undefined as R | undefined;
    await sync((s) => {
      result = change(s);
      return result.state;
    });
    if (result?.error) await showToast({ style: Toast.Style.Failure, title: result.error });
    else if (result && success)
      await showToast({ style: Toast.Style.Success, title: success(result) });
  }

  useEffect(() => {
    let first = true;
    const tick = async () => {
      const isFirst = first;
      first = false;
      // Whatever the menu bar ticker collected while this window was closed counts as time away.
      let seen: Report | undefined;
      const { state, report } = await update((s, r) => {
        if (isFirst && onTick) seen = mergeReports(structuredClone(s.unseen ?? emptyReport()), r);
        return clearAway(s);
      });
      setState(state);
      if (onTick) await onTick({ state, report, seen });
      else showReport(report);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setFrame((f) => f + 1), FRAME_MS);
    return () => clearInterval(id);
  }, []);

  return { state, frame, sync, act };
}
