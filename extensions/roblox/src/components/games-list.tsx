import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { generateGamePageLink } from "../modules/roblox-links";
import { GamePage } from "./game-page";
import { numberWithCommas } from "../modules/utils";
import {
  addGameToFavourites,
  getFaviouriteGames,
  moveFavouriteGameDown,
  moveFavouriteGameUp,
  removeGameFromFavourites,
} from "../modules/favourite-games";
import { usePromise } from "@raycast/utils";

export type GameData = {
  universeId: number;
  name: string;
  rootPlaceId: number;
  creatorName: string | null;
  playerCount: number;
  totalUpVotes: number | null;
  totalDownVotes: number | null;
};

type GameListItemOptions = {
  thumbnail?: string | null;
  onFavouritePage?: boolean;
  revalidateList?: () => void;
};

export function GamesListItem({ game, options }: { game: GameData; options: GameListItemOptions }) {
  const { universeId, name, rootPlaceId, creatorName, playerCount, totalUpVotes, totalDownVotes } = game;

  const gameURL = generateGamePageLink(rootPlaceId);

  const {
    data: universes,
    isLoading: universesLoading,
    revalidate: revalidateUniverses,
  } = usePromise(getFaviouriteGames);
  const favourited = !universesLoading && universes?.includes(universeId);

  async function revalidate() {
    await revalidateUniverses();
    if (options.revalidateList) {
      options.revalidateList();
    }
  }

  async function favouriteGame() {
    await addGameToFavourites(universeId);
    await revalidate();
  }
  async function unfavouriteGame() {
    await removeGameFromFavourites(universeId);
    await revalidate();
  }
  async function moveUp() {
    await moveFavouriteGameUp(universeId);
    await revalidate();
  }
  async function moveDown() {
    await moveFavouriteGameDown(universeId);
    await revalidate();
  }

  let imageMarkdown = undefined;
  if (options.thumbnail) {
    imageMarkdown = `
![](${options.thumbnail}?raycast-height=185)
          `;
  }

  return (
    <List.Item
      title={name}
      actions={
        <ActionPanel>
          <Action.Push icon={Icon.AppWindow} title="View" target={<GamePage universeId={universeId} />} />

          {!favourited && (
            <Action
              icon={Icon.Star}
              title="Add to Favourites"
              shortcut={Keyboard.Shortcut.Common.Pin}
              onAction={() => favouriteGame()}
            />
          )}
          {favourited && (
            <Action
              icon={Icon.StarDisabled}
              title="Remove from Favourites"
              shortcut={Keyboard.Shortcut.Common.Pin}
              onAction={() => unfavouriteGame()}
            />
          )}

          {options.onFavouritePage && (
            <Action
              icon={Icon.ArrowUp}
              title="Move Up"
              shortcut={Keyboard.Shortcut.Common.MoveUp}
              onAction={() => moveUp()}
            />
          )}
          {options.onFavouritePage && (
            <Action
              icon={Icon.ArrowDown}
              title="Move Down"
              shortcut={Keyboard.Shortcut.Common.MoveDown}
              onAction={() => moveDown()}
            />
          )}
        </ActionPanel>
      }
      detail={
        <List.Item.Detail
          markdown={imageMarkdown}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Link title="Universe ID" text={universeId.toString()} target={gameURL} />
              <List.Item.Detail.Metadata.Label title="Name" text={name} />
              {creatorName && <List.Item.Detail.Metadata.Label title="Creator" text={creatorName} />}
              <List.Item.Detail.Metadata.Label title="Playing" text={`${numberWithCommas(playerCount)} players`} />
              {totalUpVotes && (
                <List.Item.Detail.Metadata.Label title="Likes" text={`${numberWithCommas(totalUpVotes)} likes`} />
              )}
              {totalDownVotes && (
                <List.Item.Detail.Metadata.Label
                  title="Dislikes"
                  text={`${numberWithCommas(totalDownVotes)} dislikes`}
                />
              )}
            </List.Item.Detail.Metadata>
          }
        />
      }
    />
  );
}
