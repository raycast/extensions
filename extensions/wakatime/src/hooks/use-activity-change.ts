import { subDays } from "date-fns";
import { useCallback } from "react";
import { List, Icon } from "@raycast/api";

import { useBase } from "./base";
import { getSummary, getDuration } from "../utils";

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
