import { subDays } from "date-fns";
import { useCallback } from "react";
import { useCachedState } from "@raycast/utils";

import { useBase } from "./base";
import { getDuration, getLeaderBoard, getPrivateLeaderBoards, getProjects, getSummary, getUser } from "../utils";

import type { List } from "@raycast/api";

export function useUser() {
  const [cachedUser, setCachedUser] = useCachedState<WakaTime.User>("user");

  const result = useBase({
    handler: useCallback(async () => {
      const user = await getUser();
      if (user.ok) setCachedUser(user.result);
      return user;
    }, []),
    toasts: {
      loading: { title: "Loading..." },
      success: { title: "Done!!" },
      error: (err) => ({
        title: "Failed fetching data!",
        message: err.message,
      }),
    },
  });

  return { ...result, data: cachedUser };
}

export function useActivityChange() {
  const result = useBase({
    handler: useCallback(async () => {
      const summary = await getSummary("Last 1 Day", subDays(new Date(), 1));
      if (!summary.ok) throw new Error(summary.error);

      let [title, accessories] = ["You haven't recorded any activity since yesterday", [] as List.Item.Accessory[]];

      const { today = 0, yesterday = 0 } = Object.fromEntries(
        summary.result.data.map((day) => [day.range.text.toLowerCase(), day.grand_total.total_seconds])
      );

      if (today > 0 || yesterday > 0) {
        const timeDiff = Math.abs(today - yesterday);
        const [quantifier, emoji] = today <= yesterday ? ["less", "⬇️"] : ["more", "⬆️"];

        title = `You've spent ${getDuration(timeDiff)} ${quantifier} than yesterday`;

        if (today > 0 && yesterday > 0) {
          accessories = [{ text: `${Math.floor((timeDiff / yesterday) * 1e2)}% ${emoji}` }];
        }
      }

      return { ok: true, result: { title, accessories } };
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
      return { result: data.filter(Boolean) as NonNullable<typeof data[number]>[], ok: true };
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
