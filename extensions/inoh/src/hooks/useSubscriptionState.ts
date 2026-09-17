import { showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useRef } from "react";
import { fetchSubscriptionState, isPaidTier, TIER_DISPLAY_NAMES } from "../lib/subscription";
import type { SubscriptionState, SubscriptionTier } from "../lib/subscription";

/**
 * Hook that tracks the signed-in user's plan for the badge and the
 * Upgrade/Manage action. Only executes when a valid userId is provided.
 *
 * Plans change in the Inoh web app, and Raycast can't observe the browser,
 * so this leans on `useCachedPromise` being stale-while-revalidate: every
 * command open shows the last known plan instantly and re-reads it. When the
 * re-read finds the plan flipped from Free to a paid tier — the user just came
 * back from checkout — a toast confirms the upgrade, the way the Obsidian
 * plugin does on window focus.
 *
 * A failed read is reported instead of silently showing "Free" (which a
 * subscriber can't tell apart from not having paid); the toast offers Retry.
 */
export function useSubscriptionState(userId: string | null): { subscriptionState: SubscriptionState | undefined } {
  // Reason: the empty-string fallback is never fetched — `execute` gates the
  // call until a real userId exists. It only satisfies the argument type
  // without a non-null assertion.
  const { data: subscriptionState, revalidate } = useCachedPromise(
    (id: string) => fetchSubscriptionState(id),
    [userId ?? ""],
    {
      execute: !!userId,
      onError: (readError) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Couldn't check your plan",
          message: readError.message,
          primaryAction: { title: "Retry", onAction: () => revalidate() },
        });
      },
    },
  );

  const currentTier = subscriptionState?.tier;
  const previousTierRef = useRef<SubscriptionTier | undefined>(undefined);
  useEffect(() => {
    const previousTier = previousTierRef.current;
    previousTierRef.current = currentTier;
    if (previousTier === "free" && currentTier && isPaidTier(currentTier)) {
      showToast({
        style: Toast.Style.Success,
        title: `You're on Inoh ${TIER_DISPLAY_NAMES[currentTier]}`,
        message: "Thanks for subscribing!",
      });
    }
  }, [currentTier]);

  return { subscriptionState };
}
