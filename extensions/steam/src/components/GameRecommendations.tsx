import { useGamesSearch, useMyGames } from "../lib/fetcher";
import { useAI } from "@raycast/utils";
import { randomFromArray, tryJsonGameFromAi } from "../lib/util";
import { DynamicGameListItem } from "./ListItems";
import { GameDataSimple, GameSimple } from "../types";
import { useCallback, useEffect, useState } from "react";

const gamesRecLength = 5;
export const GameRecommendations = ({ recentlyViewed }: { recentlyViewed?: GameDataSimple[] }) => {
  const { data: myGames, isLoading } = useMyGames();
  const [randomPick, setRandomPick] = useState<Pick<GameSimple, "name">>();
  const [recommend, setRecommend] = useState<GameSimple>();
  const [retryCount, setRetryCount] = useState(0);
  const prompt = useCallback(() => {
    const played = myGames?.filter((game) => Number(game.playtime_forever) > 60 * 5);
    const playedSorted = [...(played ?? [])].sort((a, b) => Number(b.playtime_forever) - Number(a.playtime_forever));
    return `The following is a list of all the game I have played, in order of time I've spent playing.

${playedSorted
  .map((g) => g.name)
  .slice(0, 20)
  .join("\n")}

Also, I recently viewed the following games (list may be empty):

${recentlyViewed?.map((g) => g.name).join("\n")}

Create a new list of ${gamesRecLength} games you recommend that I should consider playing next. Do not include any of the games I listed above in this new list. Put your response in JSON format without any description, formatted like [{"name": "Game Name"}] without numbers or extra spaces, and replace Game Name with the name of the game you want to recommend. ${
      retryCount > 0 ? `The last response was not in JSON format, so double check before sending your next reply.` : ""
    }}`;
  }, [myGames, recentlyViewed, retryCount]);

  const { data: aiData } = useAI(prompt(), {
    execute: (myGames?.length ?? 0) > 0,
    stream: false,
    creativity: 0,
  });

  // TODO: update the api to support sending back multiple games
  const { data: game1 } = useGamesSearch({
    term: randomPick?.name,
    execute: randomPick !== undefined,
  });

  useEffect(() => {
    if (!aiData) return;
    const parsed = tryJsonGameFromAi(aiData);
    if (!parsed) {
      console.log("failed to parse ai data", aiData);
      setRetryCount((retryCount) => retryCount + 1);
      return;
    }
    setRandomPick(randomFromArray(parsed));
  }, [aiData]);

  useEffect(() => {
    if (!game1 || game1.length === 0) return;
    setRecommend(game1[0]);
  }, [game1]);

  if (!recommend) return null;

  return <DynamicGameListItem context="recs" game={recommend} ready={isLoading} myGames={myGames} fromAI={true} />;
};
