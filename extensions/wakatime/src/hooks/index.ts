import { subDays } from "date-fns";
import { useCallback } from "react";

import { useBase } from "./base";
import { getDuration, getLeaderBoard, getPrivateLeaderBoards, getProjects, getSummary, getUser } from "../utils";

export function useUser() {
  const result = useBase({
    handler: useCallback(getUser, []),
    toasts: {
      loading: { title: "Loading..." },
      success: { title: "Done!!" },
      error: (err) => ({
        title: "Failed fetching data!",
        message: err.message,
      }),
    },
  });

  return result;
}

export function useActivityChange() {
  const result = useBase({
    handler: useCallback(async () => {
      const data = await getSummary("Last 1 Day", subDays(new Date(), 1));
      if (!data.ok) throw new Error(data.error);
      const days = Object.fromEntries(
        data.data.map((day) => [day.range.text.toLowerCase(), day.grand_total.total_seconds])
      );

      const timeDiff = Math.abs(days.today - days.yesterday);
      const [quantifier, emoji] = days.today <= days.yesterday ? ["less", "⬇️"] : ["more", "⬆️"];

      return {
        emoji,
        ok: true,
        percent: Math.floor((timeDiff / days.yesterday) * 1e2),
        duration: `You've spent ${getDuration(timeDiff)} ${quantifier} compared to yesterday`,
      };
    }, []),
  });

  return result;
}

export function useProjects() {
  const result = useBase({
    handler: useCallback(getProjects, []),
    toasts: {
      error: (err) => ({
        title: "Failed fetching projects!",
        message: err.message,
      }),
    },
  });

  return result;
}

export function useLeaderBoard({ id, page }: { id?: string; page?: number } = {}) {
  const result = useBase({
    handler: useCallback(() => getLeaderBoard({ id, page }), [id, page]),
    toasts: {
      loading: { title: "Loading Leaderboard" },
      success: { title: "Done!!" },
      error: (err) => ({
        title: "Failed fetching data!",
        message: err.message,
      }),
    },
  });

  return result;
}

export function usePrivateLeaderBoards() {
  const result = useBase({
    handler: useCallback(getPrivateLeaderBoards, []),
    toasts: {
      loading: { title: "Loading Private Leaderboards" },
      success: { title: "Done!!" },
      error: (err) => ({
        title: "Failed fetching data!",
        message: err.message,
      }),
    },
  });

  return result;
}

export function useSummary() {
  const result = useBase({
    handler: useCallback(async () => {
      const summaries = [
        ["Today", new Date()],
        ["Yesterday", subDays(new Date(), 1)],
        ["Last 7 Days", subDays(new Date(), 7)],
        ["Last 30 Days", subDays(new Date(), 30)],
      ].map(async ([key, date]) => {
        const summary = await getSummary(key as Range, date as Date);
        if (summary.ok) return [key as Range, summary] as const;
      });

      const data = await Promise.all(summaries);
      return { data: data.filter(Boolean) as NonNullable<typeof data[number]>[], ok: true };
    }, []),
    toasts: {
      error: (err) => ({
        title: "Failed fetching summary",
        message: err.message,
      }),
    },
  });

  return result;
}

type Range = "Today" | "Yesterday" | "Last 7 Days" | "Last 30 Days";
