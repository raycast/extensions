import { Action, ActionPanel, Detail, Icon, Keyboard, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { getUpdatedText, numberWithCommas } from "../modules/utils";
import { generateGamePageLink, generateGameStartLink, generateGameStudioLink } from "../modules/roblox-links";
import { useGameThumbnails } from "../hooks/game-thumbnails";
import { addGameToFavourites } from "../modules/favourite-games";
import { useGameDetails } from "../hooks/game-details";

type PlaceResponse = {
  previousPageCursor: string | null;
  nextPageCursor: string | null;
  data: Array<{
    id: number;
    universeId: number;
    name: string;
    description: string;
  }>;
};

type RenderPlacesPageProps = {
  universeId: number;
};
export function PlacesPage({ universeId }: RenderPlacesPageProps) {
  const { data: placesData, isLoading: placesDataLoading } = useFetch<PlaceResponse>(
    `https://develop.roblox.com/v1/universes/${universeId}/places?isUniverseCreation=false&limit=100&sortOrder=Asc`,
  );

  if (placesDataLoading) {
    return <Detail isLoading={placesDataLoading} markdown={"Loading..."} />;
  }

  if (!placesData) {
    return <Detail markdown={"No places found"} />;
  }

  return (
    <List>
      {placesData.data.map((place) => {
        const { id: placeId } = place;

        const placeUrl = generateGamePageLink(placeId);
        const studioDeeplink = generateGameStudioLink(placeId);

        return (
          <List.Item
            title={place.name}
            key={placeId}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={placeUrl} />
                <Action.CopyToClipboard
                  title="Copy Place Id"
                  content={placeId}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                />
                <Action.Open
                  title="Open in Roblox Studio"
                  target={studioDeeplink}
                  shortcut={Keyboard.Shortcut.Common.Open}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

type RenderGamePageProps = {
  universeId: number;
};
export function GamePage({ universeId }: RenderGamePageProps) {
  const { data: gameData, isLoading: gameDataLoading } = useGameDetails(universeId);

  const { data: thumbnailUrls, isLoading: thumbnailDataLoading } = useGameThumbnails(universeId);

  const isLoading = gameDataLoading || thumbnailDataLoading;

  if (gameDataLoading) {
    return <Detail isLoading={isLoading} markdown={"Loading..."} />;
  }

  if (!gameData) {
    return <Detail markdown={"# 😔 No Game Found...\nCannot find game!"} />;
  }

  const { rootPlaceId, name, creator, playing, visits, favoritedCount, updated, genre, genre_l1, genre_l2 } = gameData;

  const detailMarkdown = `
# ${name}
${thumbnailUrls.map((thumbnailUrl) => `![](${thumbnailUrl}?raycast-height=450)`).join("\n\n")}
    `;

  const updatedDateText = getUpdatedText(updated);

  let creatorText = "Unknown";
  if (creator.type == "Group") {
    creatorText = creator.name + " (Group)";
  } else if (creator.type == "User") {
    creatorText = creator.name + " (User)";
  }

  const gameURL = generateGamePageLink(rootPlaceId);
  const gameDeeplink = generateGameStartLink(rootPlaceId);
  const studioDeeplink = generateGameStudioLink(rootPlaceId);

  return (
    <Detail
      isLoading={isLoading}
      markdown={detailMarkdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={gameURL} />
          <Action.CopyToClipboard
            title="Copy Universe Id"
            content={universeId}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          <Action.CopyToClipboard
            title="Copy Root Place Id"
            content={rootPlaceId}
            shortcut={Keyboard.Shortcut.Common.CopyPath}
          />
          <Action.Open title="Play with Roblox" target={gameDeeplink} shortcut={Keyboard.Shortcut.Common.Open} />
          <Action.Open
            title="Open in Roblox Studio"
            target={studioDeeplink}
            shortcut={Keyboard.Shortcut.Common.OpenWith}
          />
          <Action.Push
            icon={Icon.List}
            title="View Places"
            target={<PlacesPage universeId={universeId} />}
            shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
          />

          <Action
            icon={Icon.Star}
            title="Add to Favourites"
            shortcut={Keyboard.Shortcut.Common.Pin}
            onAction={() => addGameToFavourites(universeId)}
          />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Name" text={name} />
          <Detail.Metadata.Label title="Creator" text={creatorText} />

          <Detail.Metadata.Label title="Playing" text={`${numberWithCommas(playing)} players`} />

          <Detail.Metadata.Label title="Visits" text={`${numberWithCommas(visits)} visits`} />
          <Detail.Metadata.Label title="Favorites" text={`${numberWithCommas(favoritedCount)} favorites`} />

          <Detail.Metadata.Label title="Updated" text={updatedDateText} />

          <Detail.Metadata.TagList title="Genre">
            {genre_l2 && <Detail.Metadata.TagList.Item text={genre_l2} />}
            {genre_l1 && <Detail.Metadata.TagList.Item text={genre_l1} />}
            {genre && <Detail.Metadata.TagList.Item text={genre} />}
          </Detail.Metadata.TagList>

          <Detail.Metadata.Link title="Universe ID" text={universeId.toString()} target={gameURL} />
          <Detail.Metadata.Label title="Root Place ID" text={rootPlaceId.toString()} />
        </Detail.Metadata>
      }
    />
  );
}
