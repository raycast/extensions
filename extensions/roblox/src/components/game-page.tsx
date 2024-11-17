import { Action, ActionPanel, Detail, Icon, Keyboard, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { getUpdatedText, numberWithCommas } from "../modules/utils";
import { generateGamePageLink, generateGameStartLink, generateGameStudioLink } from "../modules/roblox-links";
import { useGameThumbnails } from "../hooks/game-thumbnails";
import { addGameToFavourites } from "../modules/favourite-games";

type GameResponse = {
  data: Array<{
    id: number;
    rootPlaceId: number;
    name: string;
    description: string;
    sourceName: string;
    sourceDescription: string;
    creator: {
      id: number;
      name: string;
      type: "Group" | "User";
      isRNVAccount: boolean;
      hasVerifiedBadge: boolean;
    };
    price: number | null;
    allowedGearGenres: string[];
    allowedGearCategories: string[];
    isGenreEnforced: boolean;
    copyingAllowed: boolean;
    playing: number;
    visits: number;
    maxPlayers: number;
    created: string;
    updated: string;
    studioAccessToApisAllowed: boolean;
    createVipServersAllowed: boolean;
    universeAvatarType: string;
    genre: string;
    genre_l1: string;
    genre_l2: string;
    isAllGenre: boolean;
    isFavoritedByUser: boolean;
    favoritedCount: number;
  }>;
};

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
    `https://develop.roblox.com/v1/universes/${universeId}/places?isUniverseCreation=false&limit=10&sortOrder=Asc`,
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
                <Action.CopyToClipboard title="Copy Place Id" content={placeId} />
                <Action.Open title="Open in Roblox Studio" target={studioDeeplink} />
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
  const { data: gameData, isLoading: gameDataLoading } = useFetch<GameResponse>(
    `https://games.roblox.com/v1/games?universeIds=${universeId}`,
  );

  const { data: thumbnailUrls, isLoading: thumbnailDataLoading } = useGameThumbnails(universeId);

  const isLoading = gameDataLoading || thumbnailDataLoading;

  if (gameDataLoading) {
    return <Detail isLoading={isLoading} markdown={"Loading..."} />;
  }

  if (!gameData) {
    return <Detail markdown={"# 😔 No Game Found...\nCannot find game!"} />;
  }

  if (!gameData || gameData.data.length === 0) {
    return <Detail markdown={"# 😔 No Game Found...\nCannot find game!"} />;
  }

  const { rootPlaceId, name, creator, playing, visits, favoritedCount, updated, genre, genre_l1, genre_l2 } =
    gameData.data[0];

  const detailMarkdown = `
# ${name}
${thumbnailUrls.map((thumbnailUrl) => `![](${thumbnailUrl})`).join("\n\n")}
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
          <Action.CopyToClipboard title="Copy Universe Id" content={universeId} />
          <Action.CopyToClipboard title="Copy Root Place Id" content={rootPlaceId} />
          <Action.Open title="Play with Roblox" target={gameDeeplink} />
          <Action.Open title="Open in Roblox Studio" target={studioDeeplink} />
          <Action.Push icon={Icon.List} title="View Places" target={<PlacesPage universeId={universeId} />} />

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
