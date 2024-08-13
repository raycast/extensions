import {
  ActionPanel,
  Action,
  List,
  open,
  showToast,
  Toast,
  Icon,
} from "@raycast/api";
import { useState } from "react";
import axios from "axios";

const DISPLAY_VALUES = {
  brandColor: "rgb(145, 70, 255)",
  copyTitle: "Copy Game URL",
  defaultDescription: 'Try something like "adventure"',
  defaultTitle: "Start typing to search",
  emptyDescription: "Try a different search",
  emptyTitle: "No results found",
  errorMessage: "Failed to fetch games",
  launchGame: "Launch Game",
  lightGrey: "#CCCCCC",
  loadingDescription: "(so many games)",
  loadingTitle: "Seaching",
  metadataGenreTitle: "Genres",
  metadataRatingTitle: "Rating",
  metadataRatingContentTitle: "Content",
  openTitle: "Open With Chrome",
  searchPlaceholder: "Search for a game on Amazon Luna",
};

// Headers generously provided by network tools
const DEFAULT_HEADERS = {
  "User-Agent": "RAYCAST",
  Accept: "*/*",
  "Accept-Language": "en-US",
  "Accept-Encoding": "gzip, deflate, br, zstd",
  Referer: "https://luna.amazon.com/",
  "x-amz-timezone": "America/Los_Angeles",
  "x-amz-device-type": "browser",
  "x-amz-platform": "web",
  "x-amz-locale": "en_US",
  "x-amz-marketplace-id": "ATVPDKIKX0DER",
  "x-amz-country-of-residence": "US",
  "Content-Type": "text/plain;charset=UTF-8",
  Origin: "https://luna.amazon.com",
};

const CHROME_KEY = "com.google.Chrome";
const EMPTY_INDICATOR = "empty";
const RAYCAST_REF = "&ref=tmp_raycast";
const LUNA_DOMAIN = "https://luna.amazon.com";
const LUNA_QUERY_PARAMS = `?g=web${RAYCAST_REF}`;
const LUNA_LOGO_IMG =
  "https://m.media-amazon.com/images/G/01/T/TC05316420/A07531864/brand/luna-logo._SX500_FMpng_.png";
const SEARCH_URL = "https://proxy-prod.us-east-1.tempo.digital.a2z.com/getPage";

/**
 * Models a game for the purpose of rendering
 */
interface LunaGame {
  imgUrl: string;
  genres?: string[];
  playUrl?: string;
  publisher?: string;
  openUrl: string;
  ratingContent?: string[];
  ratingDescription?: string;
  ratingImageUrl?: string;
  rawUrl: string;
  title: string;
}

/**
 * Approximates the model for a search result based on response data.
 */
interface SearchResult {
  pageContext: { pageType: string };
  pageMemberGroups: {
    mainContent: {
      widgets: Array<{
        actions: Array<{ target: string }>;
        id: string;
        type: string;
        widgets: Array<{
          actions: Array<{ target: string }>;
          presentationData: string;
        }>;
      }>;
    };
  };
}

/**
 * Vanity method to establish the network request body - trims the search for safety.
 *
 * @param query Search query to use
 * @returns structured query
 */
const buildRequestBody = (query: string) => {
  // Trim query to 1000 for sanity:
  query = query.substring(0, 1000);
  return {
    timeout: 3000,
    searchContext: {
      query,
      sort: "RELEVANCE",
    },
    featureScheme: "WEB_V1",
    pageContext: {
      pageType: "multistate_search_results",
      pageId: "default",
    },
    clientContext: {
      browserMetadata: {
        browserType: "RAYCAST",
      },
    },
  };
};

/**
 * Vanity method for building details for a given game
 *
 * @param game game to build details for
 * @param searchCallback callback to trigger a search with
 * @returns component for details
 */
const getDetail = (game: LunaGame, searchCallback: (query: string) => void) => {
  if (!game) return <></>;
  if (!game.imgUrl) {
    game.imgUrl = LUNA_LOGO_IMG;
  } else {
    const urlParts = game.imgUrl.split(".");
    // optimize image for display - uses what Luna is doing on it's home screen.
    urlParts.splice(urlParts.length - 1, 0, "_SX300_");
    game.imgUrl = urlParts.join(".");
  }
  return (
    <List.Item.Detail
      markdown={`![Game Art](${game.imgUrl})`}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title={DISPLAY_VALUES.metadataRatingTitle}
            icon={game.ratingImageUrl}
            text={game.ratingDescription}
          />
          <List.Item.Detail.Metadata.TagList
            title={DISPLAY_VALUES.metadataRatingContentTitle}
          >
            {game.ratingContent?.map((content) => (
              <List.Item.Detail.Metadata.TagList.Item
                color={DISPLAY_VALUES.lightGrey}
                key={content}
                text={content}
              />
            ))}
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.TagList
            title={DISPLAY_VALUES.metadataGenreTitle}
          >
            {game.genres?.map((genre) => (
              <List.Item.Detail.Metadata.TagList.Item
                color={DISPLAY_VALUES.brandColor}
                key={genre}
                text={genre}
                onAction={() => {
                  searchCallback(genre);
                }}
              />
            ))}
          </List.Item.Detail.Metadata.TagList>
        </List.Item.Detail.Metadata>
      }
    />
  );
};

const getActions = (game: LunaGame) => (
  <ActionPanel>
    <Action
      title={DISPLAY_VALUES.openTitle}
      icon={Icon.Globe}
      onAction={async () => {
        await open(game.openUrl, CHROME_KEY);
      }}
    />
    {game.playUrl ? (
      <Action
        title={DISPLAY_VALUES.launchGame}
        icon={Icon.Play}
        onAction={async () => {
          await open(game.playUrl ?? "", CHROME_KEY);
        }}
      />
    ) : (
      <></>
    )}
    <Action.CopyToClipboard
      title={DISPLAY_VALUES.copyTitle}
      shortcut={{ modifiers: ["cmd"], key: "." }}
      content={game.rawUrl}
    />
  </ActionPanel>
);

export default function Command() {
  const [games, setGames] = useState<LunaGame[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const searchGames = async (query: string) => {
    setSearchQuery(query);

    // Early return on no search
    if (!query) {
      setGames([]);
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post<SearchResult>(
        SEARCH_URL,
        buildRequestBody(query),
        { headers: DEFAULT_HEADERS },
      );

      // Early return on no results
      if (response.data.pageContext.pageType.includes(EMPTY_INDICATOR)) {
        setGames([]);
        return;
      }

      const games: LunaGame[] =
        response.data.pageMemberGroups.mainContent.widgets
          .flatMap((widget) => widget.widgets)
          .map((widget) => {
            const content = JSON.parse(widget.presentationData);
            return {
              imgUrl: content.imageLandscape,
              genres: content.genreTags,
              publisher: content.hoverDetails?.publishersText,
              ratingContent:
                content.hoverDetails?.ageRating?.contentDescription,
              ratingDescription: content.hoverDetails?.ageRating?.categoryText,
              ratingImageUrl: content.hoverDetails?.ageRating?.categoryImageUrl,
              title: content.title,
              openUrl: `${LUNA_DOMAIN}${widget.actions[0].target}${LUNA_QUERY_PARAMS}`,
              playUrl: content.hoverDetails?.productUrl
                ? `${content.hoverDetails?.productUrl}${RAYCAST_REF}`
                : undefined,
              rawUrl: `${LUNA_DOMAIN}${widget.actions[0].target} `,
            };
          });

      setGames(games);
    } catch (err) {
      console.debug("Error detected:", err);
      setGames([]);
      showToast({
        style: Toast.Style.Failure,
        title: DISPLAY_VALUES.errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={!isLoading && games.length > 0}
      filtering={false}
      onSearchTextChange={searchGames}
      searchBarPlaceholder={DISPLAY_VALUES.searchPlaceholder}
      searchText={searchQuery}
      throttle={true}
    >
      {games.length > 0 ? (
        games.map((game) => (
          <List.Item
            key={game.openUrl}
            title={game.title}
            subtitle={game.publisher}
            actions={getActions(game)}
            detail={getDetail(game, async (genre: string) => {
              await searchGames(genre);
            })}
          />
        ))
      ) : (
        <List.EmptyView
          icon={{ source: LUNA_LOGO_IMG }}
          title={
            searchQuery
              ? isLoading
                ? DISPLAY_VALUES.loadingTitle
                : DISPLAY_VALUES.emptyTitle
              : DISPLAY_VALUES.defaultTitle
          }
          description={
            searchQuery
              ? isLoading
                ? DISPLAY_VALUES.loadingDescription
                : DISPLAY_VALUES.emptyDescription
              : DISPLAY_VALUES.defaultDescription
          }
        />
      )}
    </List>
  );
}
