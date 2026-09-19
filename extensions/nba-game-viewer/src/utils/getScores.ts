import axios from "axios";
import { getPreferenceValues } from "@raycast/api";

type GetScoresArgs = {
  league: string;
};

const getScores = async ({ league }: GetScoresArgs) => {
  const baseUrl = `https://site.api.espn.com/apis/site/v2/sports/basketball/${league}/scoreboard`;
  const { numDaysScores } = getPreferenceValues<Preferences>();
  const today = new Date();
  const dates = [];

  for (let offset = Number(numDaysScores); offset >= 0; offset--) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    dates.push(date.toISOString().split("T")[0].replace(/-/g, ""));
  }

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
