import { subDays } from "date-fns";
import { useCallback } from "react";
import { Icon, List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";

import { useBase } from "./base";
import { getDuration, getLeaderBoard, getPrivateLeaderBoards, getProjects, getSummary, getUser } from "../utils";

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

      const { today, yesterday } = summary.result.data.reduce((acc, cur) => {
        return {
          ...acc,
          [cur.range.text.toLowerCase()]: {
            seconds: cur.grand_total.total_seconds,
            languages: cur.languages.reduce(
              (acc, language) => ({ ...acc, [language.name]: language.total_seconds }),
              {}
            ),
          },
        };
      }, {} as { [K in "today" | "yesterday"]: ActivityDay });

      let title = "You haven't recorded any activity since yesterday";
      const seconds = Math.abs(today.seconds - yesterday.seconds);
      const languages = Object.entries(yesterday.languages).reduce(
        (acc, [name, seconds]) => ({
          ...acc,
          [name]: { seconds, quantifier: "equal" as const, duration: getDuration(seconds) },
        }),
        {} as {
          [K: string]: {
            seconds: number;
            duration: string;
            percent?: string;
            quantifier: "more" | "less" | "equal";
          };
        }
      );

      let [percent, duration, quantifier, accessories] = ["", "0 sec", "less", [] as List.Item.Accessory[]];

      if (today.seconds > 0 || yesterday.seconds > 0) {
        if (today.seconds > yesterday.seconds) quantifier = "more";

        duration = getDuration(seconds);
        title = `${duration} ${quantifier} time spent compared to yesterday`;

        for (const language in today.languages) {
          let quantifier: "more" | "less" = "more";
          const yesterday = languages[language];
          const todaySeconds = today.languages[language];

          let seconds = todaySeconds;
          let percent: string | undefined;
          let duration = getDuration(todaySeconds);

          if (yesterday != undefined) {
            const languageSecondsDiff = Math.abs(todaySeconds - yesterday.seconds);

            seconds = languageSecondsDiff;
            duration = getDuration(languageSecondsDiff);
            quantifier = yesterday.seconds < todaySeconds ? "more" : "less";
            percent = `${Math.floor((languageSecondsDiff / yesterday.seconds) * 1e2)}%`;
          }

          languages[language] = { seconds, quantifier, duration, percent };
        }

        if (today.seconds > 0 && yesterday.seconds > 0) {
          const percentChange = (seconds / yesterday.seconds) * 1e2;
          percent = `${percentChange.toFixed(1)}%`;
          accessories = [{ text: `${Math.floor(percentChange)}%`, icon: Icon.Heartbeat }];
        }
      }

      return {
        ok: true,
        result: {
          title,
          accessories,
          overall: { seconds, percent, quantifier, duration },
          languages: Object.entries(languages).filter(([, l]) => l.quantifier !== "equal"),
        },
      };
    }, []),
  });

  return result;
}

type ActivityDay = {
  seconds: number;
  languages: { [K: string]: number };
};

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
