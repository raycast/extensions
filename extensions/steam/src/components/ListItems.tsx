import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { GameData, GameDataSimple, GameSimple } from "../types";
import { DefaultActions, LaunchActions } from "./Actions";
import { GameDetails } from "./GameDetails";
import { itemId, playtimeText } from "../lib/util";
import { useGameData } from "../lib/fetcher";
import { cachedDetails } from "../lib/details";
import { releaseTag } from "../lib/release-tag";

export const DynamicGameListItem = ({
  game,
  context,
  ready,
  myGames = [],
  showingDetail = false,
  onToggleDetail,
  search,
}: {
  game: GameSimple;
  context: "recent" | "recently-viewed" | "random" | "similar" | "Search";
  ready: boolean;
  myGames?: GameDataSimple[];
  showingDetail?: boolean;
  onToggleDetail?: () => void;
  search?: string;
}) => {
  const { data: gameData, icon: detailIcon, isError: error } = useGameData({ appid: game.appid, execute: ready });
  const owned = myGames.find((g) => g.appid === game.appid);
  const image = owned?.img_icon_url
    ? `https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/${game.appid}/${owned.img_icon_url}.jpg`
    : (game.icon ?? detailIcon);
  const genericIcon = {
    source: gameData?.type === "game" ? Icon.GameController : Icon.Circle,
    tintColor: error ? Color.Red : gameData ? Color.SecondaryText : undefined,
  };

  return (
    <List.Item
      title={game?.name ?? ""}
      id={itemId(context, game?.appid, search)}
      icon={image ? { source: image } : genericIcon}
      accessories={
        showingDetail
          ? undefined
          : [
              ...(owned ? [{ tag: { value: "Owned", color: Color.Blue } }] : []),
              ...(gameData?.type && gameData.type !== "game" ? [{ tag: gameData.type }] : []),
              (error ? { text: "Game not found" } : releaseTag(gameData?.release_date?.date)) ?? {},
            ]
      }
      detail={showingDetail ? <GameListDetail gameData={gameData} notFound={Boolean(error)} /> : undefined}
      actions={
        <ActionPanel>
          <Action.Push
            icon={Icon.Sidebar}
            title="View Game Details"
            target={<GameDetails game={{ appid: game.appid, name: game.name, icon: game.icon }} />}
          />
          {onToggleDetail ? (
            <Action
              icon={Icon.AppWindowSidebarRight}
              title={showingDetail ? "Hide Details" : "Show Details"}
              shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
              onAction={onToggleDetail}
            />
          ) : null}
          <LaunchActions name={game.name} appid={game?.appid} />
          <DefaultActions />
        </ActionPanel>
      }
    />
  );
};

const GameListDetail = ({ gameData, notFound }: { gameData?: GameData; notFound: boolean }) => (
  <List.Item.Detail
    isLoading={!gameData && !notFound}
    markdown={
      notFound
        ? "Steam has no store page for this game."
        : gameData
          ? `![](${gameData.header_image})\n\n${gameData.short_description}`
          : undefined
    }
    metadata={
      gameData ? (
        <List.Item.Detail.Metadata>
          {gameData.price_overview ? (
            <List.Item.Detail.Metadata.Label title="Price" text={gameData.price_overview.final_formatted} />
          ) : gameData.is_free ? (
            <List.Item.Detail.Metadata.Label title="Price" text="Free" />
          ) : null}
          {gameData.release_date?.date ? (
            <List.Item.Detail.Metadata.Label title="Release Date" text={gameData.release_date.date} />
          ) : null}
          {gameData.developers?.length ? (
            <List.Item.Detail.Metadata.Label title="Developer" text={gameData.developers.join(", ")} />
          ) : null}
          {gameData.genres?.length ? (
            <List.Item.Detail.Metadata.TagList title="Genres">
              {gameData.genres.slice(0, 4).map((genre) => (
                <List.Item.Detail.Metadata.TagList.Item key={genre.id} text={genre.description} />
              ))}
            </List.Item.Detail.Metadata.TagList>
          ) : null}
          {gameData.metacritic?.score ? (
            <List.Item.Detail.Metadata.Label title="Metacritic" text={String(gameData.metacritic.score)} />
          ) : null}
        </List.Item.Detail.Metadata>
      ) : undefined
    }
  />
);

export const MyGamesListType = ({ game, id, detail }: { game: GameDataSimple; id?: string; detail?: string }) => (
  <List.Item
    id={id}
    key={game.appid}
    title={game.name}
    icon={{
      source: `https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`,
    }}
    accessories={[
      { text: detail ?? playtimeText(game.playtime_forever) },
      releaseTag(cachedDetails(game.appid)?.data.release_date?.date) ?? {},
    ]}
    actions={
      <ActionPanel>
        <Action.Push icon={Icon.Sidebar} title="View Game Details" target={<GameDetails game={game} />} />
        <LaunchActions name={game.name} appid={game?.appid} />
        <DefaultActions />
      </ActionPanel>
    }
  />
);
