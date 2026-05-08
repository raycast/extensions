import { useFetch } from "@raycast/utils";
import { Subscription } from "./types";
import { getPreferenceValues } from "@raycast/api";

export const fetchSubscriptions = () => {
  const { subwatchApiKey } = getPreferenceValues<Preferences>();
  const now = new Date();

  return useFetch<[Subscription]>(
    `https://subwatch.co/api/subscription?month=${now.getMonth() + 1}&year=${now.getFullYear()}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json", "x-api-key": subwatchApiKey },
    },
  );
};
