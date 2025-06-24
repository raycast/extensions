import { Root } from "../types/nba-scores-raw";
import { useFetch } from "@raycast/utils";
import { cleanRawNBAScores } from "../utils/nba-data-mapper";

export default function useNBAScores() {
  const { isLoading, data, revalidate } = useFetch<Root>(
    "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard",
  );
  const gameData = cleanRawNBAScores(data);

  return { isLoading, data, gameData, revalidate };
}
