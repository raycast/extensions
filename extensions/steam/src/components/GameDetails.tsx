import { ActionPanel, Detail, LocalStorage, showToast, Toast } from "@raycast/api";
import { useEffect, useRef } from "react";
import { useGameData } from "../lib/fetcher";
import { useIsLoggedIn } from "../lib/hooks";
import { GameData, GameDataSimple, GameSimple } from "../types";
import { LaunchActions } from "./Actions";

export const GameDetails = ({ game }: { game: GameSimple | GameDataSimple }) => {
  const { data: gameData, isError: error } = useGameData<GameData>({ appid: game.appid });
  const once = useRef(false);
  const isLoggedIn = useIsLoggedIn();

  const markdown = gameData
    ? `
![Game header image](${gameData.header_image})

${gameData.short_description}

`
    : null;

  // To do more here we would need an html to md converter

  useEffect(() => {
    if (error?.status === 404 && !once.current) {
      once.current = true;
      showToast({
        title: "Error",
        message: error.message,
        style: Toast.Style.Failure,
      });
    }
  }, [error]);

  useEffect(() => {
    if (!game?.appid || error) return;
    // prepend to localstorage max 10 entries or 5 if logged in
    LocalStorage.getItem("recently-viewed").then((gamesRaw) => {
      const games: GameSimple[] = gamesRaw ? JSON.parse(String(gamesRaw)) : [];
      if (games.some((g) => g.appid === game.appid)) return;
      const newItems = [game, ...(games?.slice(0, isLoggedIn ? 4 : 9) ?? [])];
      LocalStorage.setItem("recently-viewed", JSON.stringify(newItems));
    });
  }, [game, error, isLoggedIn]);

  return (
    <Detail
      isLoading={!gameData}
      navigationTitle={gameData?.name}
      markdown={error ? error?.message : markdown}
      actions={
        error ? null : (
          <ActionPanel>
            <LaunchActions name={game.name} appid={game?.appid} />
          </ActionPanel>
        )
      }
      metadata={
        error ? null : (
          <Detail.Metadata>
            {gameData?.price_overview ? (
              <Detail.Metadata.Label title="Price" text={gameData?.price_overview.final_formatted} />
            ) : null}
            {gameData?.release_date?.date ? (
              <Detail.Metadata.Label title="Release Date" text={gameData?.release_date?.date} />
            ) : null}
            {gameData?.metacritic?.url ? (
              <Detail.Metadata.Link
                title="Data"
                text={
                  gameData?.metacritic?.score ? `Metacritic: ${gameData?.metacritic?.score.toString()}` : "Metacritic"
                }
                target={gameData.metacritic.url}
              />
            ) : null}
            {gameData?.developers?.length > 0 ? (
              <Detail.Metadata.TagList title="Developers">
                <Detail.Metadata.TagList.Item color={"#67c0f4"} text={gameData?.developers[0]} />
              </Detail.Metadata.TagList>
            ) : null}
            {gameData?.categories?.length > 0 ? (
              <>
                <Detail.Metadata.Separator />
                <Detail.Metadata.TagList title="Categories">
                  {gameData?.categories[0]?.description ? (
                    <Detail.Metadata.TagList.Item color={"#cccccc"} text={gameData?.categories[0]?.description} />
                  ) : null}
                  {gameData?.categories[1]?.description ? (
                    <Detail.Metadata.TagList.Item color={"#cccccc"} text={gameData?.categories[1]?.description} />
                  ) : null}
                  {gameData?.categories[2]?.description ? (
                    <Detail.Metadata.TagList.Item color={"#cccccc"} text={gameData?.categories[2]?.description} />
                  ) : null}
                  {gameData?.categories[3]?.description ? (
                    <Detail.Metadata.TagList.Item color={"#cccccc"} text={gameData?.categories[3]?.description} />
                  ) : null}
                  {gameData?.categories[4]?.description ? (
                    <Detail.Metadata.TagList.Item color={"#cccccc"} text={gameData?.categories[4]?.description} />
                  ) : null}
                </Detail.Metadata.TagList>
              </>
            ) : null}
            {gameData?.platforms ? <Detail.Metadata.Separator /> : null}
            {gameData?.platforms ? (
              <Detail.Metadata.TagList title="Platform">
                {gameData.platforms?.windows && <Detail.Metadata.TagList.Item text="Windows" color={"#7eba43"} />}
                {gameData.platforms?.mac && <Detail.Metadata.TagList.Item text="Mac" color={"#512f5f"} />}
                {gameData.platforms?.linux && <Detail.Metadata.TagList.Item text="Linux" color={"#1893d1"} />}
              </Detail.Metadata.TagList>
            ) : null}
            {gameData?.steam_appid || gameData?.website ? <Detail.Metadata.Separator /> : null}
            {gameData?.steam_appid ? (
              <Detail.Metadata.Link
                title=""
                target={`https://store.steampowered.com/app/${gameData.steam_appid}`}
                text="Steam Page"
              />
            ) : null}
            {gameData?.website ? <Detail.Metadata.Link title="" text="Website" target={gameData.website} /> : null}
          </Detail.Metadata>
        )
      }
    />
  );
};
