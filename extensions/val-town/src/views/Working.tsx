import { Icon, List, Toast, showToast } from "@raycast/api";
import { useState } from "react";
import { errorMessage } from "../lib/format";

/** A named wait: what to put on screen, and what to call it if the work fails. */
export type Busy = {
  icon: Icon;
  title: string;
  failure: string;
};

/** Below this a wait reads as a flash rather than a screen, so it is held even when work is quicker. */
const FLOOR_MS = 1000;

async function holdFloor(started: number): Promise<void> {
  const remaining = FLOOR_MS - (Date.now() - started);
  if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
}

/**
 * One wait at a time, with the screen and Raycast's animated toast kept in step. Resolves true when
 * the work succeeded, so a caller can navigate away only on success.
 */
export function useBusy(initial: Busy | null = null) {
  const [busy, setBusy] = useState<Busy | null>(initial);

  async function run(state: Busy, work: () => Promise<void>): Promise<boolean> {
    setBusy(state);
    const toast = await showToast({ style: Toast.Style.Animated, title: state.title });
    const started = Date.now();

    try {
      await work();
      await holdFloor(started);
      await toast.hide();
      setBusy(null);
      return true;
    } catch (error) {
      await holdFloor(started);
      setBusy(null);
      // Morphed rather than replaced, so a second toast never races the animated one away.
      toast.style = Toast.Style.Failure;
      toast.title = state.failure;
      toast.message = errorMessage(error);
      return false;
    }
  }

  return { busy, run };
}

/**
 * Raycast never draws an EmptyView while a List is loading and unsearched, so `isLoading` would hide
 * this entirely. The icon is a built-in, so nothing loads mid-wait; the motion is the toast's.
 */
export function Working({ busy, navigationTitle }: { busy: Busy; navigationTitle?: string }) {
  return (
    <List navigationTitle={navigationTitle}>
      <List.EmptyView icon={busy.icon} title={busy.title} />
    </List>
  );
}
