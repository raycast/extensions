import axios from "axios";
import { getPreferenceValues } from "@raycast/api";
import getScoreDates from "./scoreDates";

type GetScoresArgs = {
  league: string;
};

const getScores = async ({ league }: GetScoresArgs) => {
  const baseUrl = `https://site.api.espn.com/apis/site/v2/sports/basketball/${league}/scoreboard`;
  const { numDaysScores } = getPreferenceValues<Preferences>();
  const dates = getScoreDates(new Date(), Number(numDaysScores));

  const responses = await Promise.all(
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

  return responses.flatMap(({ data }) => data.events);
};

export default getScores;
