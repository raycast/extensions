import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { GameData, GameDataSimple, GameSimple } from "../types";
import { DefaultActions, LaunchActions } from "./Actions";
import { GameDetails } from "./GameDetails";
import { humanTime } from "../lib/util";
import { useGameData } from "../lib/fetcher";
import { useEffect, useState } from "react";

export const DynamicGameListItem = ({
  game,
  ready,
  myGames = [],
}: {
  game: GameSimple;
  ready: boolean;
  myGames?: GameDataSimple[];
}) => {
  const [gameData, setGameData] = useState<GameData>();
  const [notFound, setNotFound] = useState(false);
  const [iconColor, setIconColor] = useState<Color.ColorLike>();
  const { data, isError: error } = useGameData({ appid: game.appid, ready });
  const [ownedData, setOwnedData] = useState<GameDataSimple>();

  useEffect(() => {
    if (!data) return;
    setIconColor(Color.Green);
    setGameData(data);
  }, [data]);

  useEffect(() => {
    if (error) {
      setIconColor(Color.Red);
      setNotFound(true);
    }
  }, [error]);

  useEffect(() => {
    if (!myGames?.length || !game?.appid) return;
    const isOwned = myGames.findIndex((g) => g.appid === game.appid);
    setOwnedData(isOwned > -1 ? myGames[isOwned] : undefined);
  }, [game, myGames]);

  return (
    <List.Item
      title={game?.name ?? ""}
      subtitle={gameData?.type === "game" ? undefined : gameData?.type}
      id={game?.appid ? game.appid.toString() : ""}
      icon={{
        source: ownedData?.img_icon_url
          ? `https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/${game.appid}/${ownedData.img_icon_url}.jpg`
          : Icon.Circle,
        tintColor: ownedData?.img_icon_url ?? iconColor,
      }}
      accessories={[{ text: notFound ? "Game not found" : gameData?.release_date?.date }]}
      actions={
        <ActionPanel>
          <Action.Push icon={Icon.Sidebar} title="View Game Details" target={<GameDetails game={game} />} />
          <LaunchActions appid={game?.appid} />
          <DefaultActions />
        </ActionPanel>
      }
    />
  );
};

export const MyGamesListType = ({ game }: { game: GameDataSimple }) => (
  <List.Item
    key={game.appid}
    title={game.name}
    icon={{
      source: `https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`,
    }}
    accessories={[{ text: game?.playtime_forever ? "Played for " + humanTime(game.playtime_forever) : undefined }]}
    actions={
      <ActionPanel>
        <Action.Push icon={Icon.Sidebar} title="View Game Details" target={<GameDetails game={game} />} />
        <LaunchActions appid={game?.appid} />
        <DefaultActions />
      </ActionPanel>
    }
  />
);
