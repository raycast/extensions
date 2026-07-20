import { ActionPanel, Action, List, Color } from "@raycast/api";
import { useFetch, Response } from "@raycast/utils";
import { useState } from "react";
import { URLSearchParams } from "node:url";
import { decode } from "html-entities";

// Type definitions
interface SearchResult {
  id: string;
  title: string;
  artist: string;
  bnm: boolean;
  bnr: boolean;
  type: string;
  date: string;
  url: string;
  score: string;
  author: string;
  genre: string;
  image: string;
  searchScore: number;
}

interface PitchforkApiResponse {
  coreDataLayer: {
    search: {
      searchTerms: string;
    };
  };
  search: {
    items: Array<{
      contentType: string;
      items: PitchforkReviewItem[];
    }>;
  };
}

interface PitchforkReviewItem {
  id: string;
  dangerousHed: string;
  subHed?: {
    name: string;
  };
  ratingValue: {
    isBestNewMusic: boolean;
    isBestNewReissue: boolean;
    score: number;
  };
  contentType: string;
  pubDate: string;
  url: string;
  contributors: {
    author: {
      items: Array<{
        name: string;
      }>;
    };
  };
  rubric: Array<{
    name: string;
  }>;
  image: {
    sources: {
      sm: {
        srcset: string;
      };
    };
  };
}

// Utility functions for scoring search results
function autocompleteScore(query: string, text: string): number {
  if (!query || !text) return 0;

  const wordsQ = new Set(query.toLowerCase().split(/\W+/));
  const wordsT = text.toLowerCase().split(/\W+/);

  // Token overlap / Jaccard similarity
  const overlap = wordsT.filter((w) => wordsQ.has(w)).length;
  const jaccard = overlap / (wordsQ.size + new Set(wordsT).size - overlap);

  // Prefix / early-match boost
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  const posBoost = idx === 0 ? 1 : idx > 0 ? 1 - idx / text.length : 0;

  // Combine with weighted scores
  return jaccard * 0.7 + posBoost * 0.3;
}

function combinedAutocompleteScore(
  query: string,
  result: Pick<SearchResult, "title" | "artist">,
): number {
  const score1 = autocompleteScore(query, result.title);
  const score2 = autocompleteScore(query, result.artist);
  return (score1 + score2) / 2;
}

// Parse and transform API response
async function parseFetchResponse(response: Response): Promise<SearchResult[]> {
  // Handle non-OK responses (including 400 Bad Request for empty queries)
  if (!response.ok) {
    // If it's a bad request, likely due to empty/invalid query, return empty array gracefully
    if (response.status === 400) {
      return [];
    }
    throw new Error(`${response.status}: ${response.statusText}`);
  }

  const json = (await response.json()) as PitchforkApiResponse;
  const query = json.coreDataLayer?.search?.searchTerms || "";

  // If query is empty, just whitespace, or is our placeholder, return empty results
  if (!query || query.trim().length === 0 || query === "placeholder") {
    return [];
  }

  const searchItems = json.search?.items || [];
  const reviewSection = searchItems.find((obj) => obj.contentType === "review");
  const reviews = reviewSection?.items || [];

  if (reviews.length === 0) {
    return [];
  }

  const mappedReviews: SearchResult[] = reviews
    .map((item) => mapReviewItem(item, query))
    .sort((a, b) => b.searchScore - a.searchScore);

  return mappedReviews;
}

function mapReviewItem(item: PitchforkReviewItem, query: string): SearchResult {
  // Extract image URL from srcset, preferring w_240 size
  const srcset = item.image?.sources?.sm?.srcset || "";
  const imageMatch = srcset.match(/https:[^ ]*w_240[^ ]*(?=\s240w)/)?.[0];
  const imageUrl = imageMatch?.replaceAll("w_240", "w_200") || "";

  // Remove HTML emphasis tags from title
  const dangerousHed = item.dangerousHed || "";
  const cleanTitle = dangerousHed.replace(/<em[^>]*>(.*?)<\/em>/gi, "$1");

  const artistName = item.subHed?.name || "Various Artists";
  const decodedArtist = decode(artistName);

  const score = item.ratingValue?.score;

  const authorName =
    item.contributors?.author?.items?.[0]?.name || "Unknown Author";
  const decodedAuthor = decode(authorName);

  const genreName = item.rubric?.[0]?.name || "Unknown";

  const result: SearchResult = {
    id: item.id,
    title: decode(cleanTitle) || "Unknown Title",
    artist: decodedArtist,
    bnm: item.ratingValue?.isBestNewMusic || false,
    bnr: item.ratingValue?.isBestNewReissue || false,
    type: item.contentType,
    date: item.pubDate,
    url: `https://pitchfork.com${item.url}`,
    score: score ? score.toFixed(1) : "N/A",
    author: decodedAuthor,
    genre: genreName,
    image: imageUrl,
    searchScore: 0, // Will be set below
  };

  result.searchScore = combinedAutocompleteScore(query, result);
  return result;
}

// Main component
export default function Command() {
  const [searchText, setSearchText] = useState("");

  // Pitchfork API requires a non-empty query
  // When search is empty, we'll skip fetching (handled via conditional)
  const hasQuery = searchText.trim().length > 0;
  const query = searchText.trim();
  const searchUrl = hasQuery
    ? "https://pitchfork.com/search/?" +
      new URLSearchParams({
        q: query,
        format: "json",
      })
    : "https://pitchfork.com/search/?q=__NO_QUERY__&format=json"; // Dummy URL that won't be used

  // Only make request when we have a valid query
  // Use a minimal valid query when empty to avoid 400 errors
  const fetchUrl = hasQuery
    ? searchUrl
    : "https://pitchfork.com/search/?q=placeholder&format=json"; // Won't be used since we return [] when no query

  const { data, isLoading, error } = useFetch<SearchResult[]>(fetchUrl, {
    parseResponse: parseFetchResponse,
  });

  // Return empty array when no query to avoid showing errors
  const displayData = hasQuery ? data : [];

  // Determine empty state message based on current state
  const getEmptyState = () => {
    if (error && hasQuery) {
      return {
        title: "Error loading reviews",
        description: `Error: ${error.message}. Check console for details.`,
      };
    }
    if (hasQuery && !isLoading && displayData && displayData.length === 0) {
      return {
        title: "No results found",
        description: `No reviews found for "${searchText}". Try a different search term.`,
      };
    }
    return {
      title: "Search Pitchfork Reviews",
      description: "Start typing to search for album reviews",
    };
  };

  const emptyState = getEmptyState();

  return (
    <List
      isShowingDetail={displayData && displayData.length > 0}
      isLoading={isLoading && hasQuery}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search reviews from pitchfork.com"
    >
      <List.EmptyView
        title={emptyState.title}
        description={emptyState.description}
        icon={{ source: "pitchcast-icon.svg" }}
      />
      {displayData && displayData.length > 0 && (
        <List.Section title="Results" subtitle={displayData.length.toString()}>
          {displayData.map((searchResult) => (
            <SearchListItem key={searchResult.id} searchResult={searchResult} />
          ))}
        </List.Section>
      )}
    </List>
  );
}

// List item component
function SearchListItem({ searchResult }: { searchResult: SearchResult }) {
  const date = searchResult.date ? new Date(searchResult.date) : null;

  const accessories = [
    (searchResult.bnm || searchResult.bnr) && { icon: "bnm.svg" },
    searchResult.score && { text: searchResult.score },
  ].filter(
    (item): item is { icon: string } | { text: string } =>
      item !== false && item !== "",
  );

  return (
    <List.Item
      title={searchResult.artist}
      subtitle={searchResult.title}
      icon={searchResult.image ? { source: searchResult.image } : undefined}
      accessories={accessories}
      actions={
        searchResult.url ? (
          <ActionPanel>
            <Action.OpenInBrowser
              title="Open in Browser"
              url={searchResult.url}
            />
            <Action.CopyToClipboard
              title="Copy URL"
              content={searchResult.url}
            />
          </ActionPanel>
        ) : undefined
      }
      detail={
        <List.Item.Detail
          markdown={
            searchResult.image
              ? `<img src="${searchResult.image}" alt="${searchResult.title}" style="width: 100px; height: 100px;" />`
              : undefined
          }
          metadata={
            <List.Item.Detail.Metadata>
              {searchResult.bnm && (
                <List.Item.Detail.Metadata.TagList title="">
                  <List.Item.Detail.Metadata.TagList.Item
                    text="Best New Music"
                    color={Color.Red}
                  />
                </List.Item.Detail.Metadata.TagList>
              )}
              {searchResult.bnr && (
                <List.Item.Detail.Metadata.TagList title="">
                  <List.Item.Detail.Metadata.TagList.Item
                    text="Best New Reissue"
                    color={Color.Red}
                  />
                </List.Item.Detail.Metadata.TagList>
              )}
              <List.Item.Detail.Metadata.Label
                title="Artist"
                text={searchResult.artist}
              />
              <List.Item.Detail.Metadata.Label
                title="Album"
                text={searchResult.title}
              />
              <List.Item.Detail.Metadata.Label
                title="Score"
                text={searchResult.score}
              />
              <List.Item.Detail.Metadata.Label
                title="Genre"
                text={searchResult.genre}
              />
              {date && (
                <List.Item.Detail.Metadata.Label
                  title="Date"
                  text={date.toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                />
              )}
              {searchResult.author && (
                <List.Item.Detail.Metadata.Label
                  title="Author"
                  text={searchResult.author}
                />
              )}
              {searchResult.url && (
                <>
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="URL"
                    text={searchResult.url}
                  />
                </>
              )}
            </List.Item.Detail.Metadata>
          }
        />
      }
    />
  );
}
