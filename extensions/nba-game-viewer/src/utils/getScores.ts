import axios from "axios";
import { getPreferenceValues } from "@raycast/api";
import getScoreDates from "./scoreDates";

type GetScoresArgs = {
  league: string;
};

const getScores = async ({ league }: GetScoresArgs) => {
  const baseUrl = `https://site.api.espn.com/apis/site/v2/sports/basketball/${league}/scoreboard`;
  const { numDaysScores } = getPreferenceValues<Preferences>();

  const dates = getScoreDates(new Date(), numDaysScores);

  const responses = await Promise.allSettled(
    dates.map((date) =>
      axios.get(baseUrl, {
        params: {
          region: "us",
          lang: "en",
          contentorigin: "espn",
          dates: date,
        },
      }),
    ),
  );

  const rejected = responses.filter((response): response is PromiseRejectedResult => response.status === "rejected");

  if (rejected.length === responses.length) {
    throw rejected[0].reason;
  }

  return responses.flatMap((response) => (response.status === "fulfilled" ? (response.value.data.events ?? []) : []));
};

export default getScores;
