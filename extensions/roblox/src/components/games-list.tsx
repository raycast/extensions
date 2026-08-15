import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { generateGamePageLink, generateGameStartLink } from "../modules/roblox-links";
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
import { useState, useEffect } from "react";

const THUMBNAIL_SWITCH_INTERVAL = 2500;

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
  thumbnails?: string[] | null;
  onFavouritePage?: boolean;
  revalidateList?: () => void;
};

export function GamesListItem({ game, options }: { game: GameData; options: GameListItemOptions }) {
  const { universeId, name, rootPlaceId, creatorName, playerCount, totalUpVotes, totalDownVotes } = game;
  const [currentThumbnail, setCurrentThumbnail] = useState<string | undefined>(undefined);

  const gameURL = generateGamePageLink(rootPlaceId);

  const {
    data: universes,
    isLoading: universesLoading,
    revalidate: revalidateUniverses,
  } = usePromise(getFaviouriteGames);
  const favourited = !universesLoading && universes?.includes(universeId);

  const [currentThumbnailIndex, setCurrentThumbnailIndex] = useState(0);
  useEffect(() => {
    if (options.thumbnails && options.thumbnails.length > 0) {
      const switchThumbnail = () => {
        setCurrentThumbnailIndex((prevIndex) => (prevIndex + 1) % options.thumbnails!.length);
      };

      setCurrentThumbnail(options.thumbnails[0]); // Set initial thumbnail
      const intervalId = setInterval(switchThumbnail, THUMBNAIL_SWITCH_INTERVAL);

      return () => clearInterval(intervalId);
    }
  }, [options.thumbnails]);
  useEffect(() => {
    if (options.thumbnails && options.thumbnails.length > 0) {
      setCurrentThumbnail(options.thumbnails[currentThumbnailIndex]);
    }
  }, [currentThumbnailIndex, options.thumbnails]);

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
  if (currentThumbnail) {
    imageMarkdown = `
![](${currentThumbnail}?raycast-height=185)
          `;
  }

  const gameDeeplink = generateGameStartLink(rootPlaceId);

  return (
    <List.Item
      title={name}
      actions={
        <ActionPanel>
          <Action.Push icon={Icon.AppWindow} title="View" target={<GamePage universeId={universeId} />} />

          <Action.Open title="Play with Roblox" target={gameDeeplink} shortcut={Keyboard.Shortcut.Common.Open} />

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
