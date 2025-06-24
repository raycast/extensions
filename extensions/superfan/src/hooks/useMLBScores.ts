import { Root } from "../types/mlb-scores-raw";
import { useFetch } from "@raycast/utils";
import { cleanRawMlbScores } from "../utils/mlb-data-mapper";
import { RootTwo } from "../types/mlb-team-raw";

const teamIds = Array.from({ length: 30 }, (_, i) => (i + 1).toString());

export const logoCache = new Map<string, string>();

export async function fetchAllLogos() {
  const fetchPromises = teamIds.map(async (id) => {
    const response = await fetch(`http://site.api.espn.com/apis/site/v2/sports/baseball/mlb/teams/${id}`);
    const data: RootTwo = await response.json();
    logoCache.set(id, data?.team.logos[1]?.href);
  });

  await Promise.all(fetchPromises);
}

export default function useMLBScores() {
  const { isLoading, data, revalidate } = useFetch<Root>(
    "http://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard",
  );
  const gameData = cleanRawMlbScores(data);

  return { isLoading, data, gameData, revalidate };
}
