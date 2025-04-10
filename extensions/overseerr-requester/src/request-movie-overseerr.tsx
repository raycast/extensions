import { ActionPanel, Action, List, getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { MovieDetail } from "./components/MovieDetail";
import { RequestForm } from "./components/RequestForm";
import { MovieResult } from "../types";
import { MediaInfo } from "../types";

interface Preferences {
  apiUrl: string;
  apiKey: string;
}

interface SearchResponse {
  page: number;
  totalPages: number;
  totalResults: number;
  results: MovieResult[];
}

export default function Command() {
  const { apiUrl, apiKey } = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState("");

  // Determine which URL to use based on searchText
  const fetchUrl = searchText
    ? `${apiUrl.replace(/\/$/, "")}/search?query=${encodeURIComponent(searchText)}&page=1&language=en`
    : `${apiUrl.replace(/\/$/, "")}/discover/movies?page=1&language=en&sortBy=popularity.desc`;

  const { isLoading, data } = useFetch<SearchResponse>(fetchUrl, {
    headers: {
      "X-Api-Key": apiKey,
      accept: "application/json",
    },
    parseResponse: (response) => response.json(),
  });

  console.log("API URL:", fetchUrl);
  console.log("Response:", data);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search movies or browse trending..."
      throttle
    >
      <List.Section
        title={searchText ? "Search Results" : "Discover Movies"}
        subtitle={data?.results?.length.toString() ?? "0"}
      >
        {data?.results?.map((movie) => <MovieListItem key={movie.id} movie={movie} />) || []}
      </List.Section>
    </List>
  );
}

function MovieListItem({ movie }: { movie: MovieResult }) {
  const title = movie.title || movie.name || "Unknown Title";
  const releaseDate = movie.releaseDate || movie.firstAirDate || "";
  const year = releaseDate ? new Date(releaseDate).getFullYear() : "";

  // Format vote average with null check
  const rating = typeof movie.voteAverage === "number" ? `⭐ ${movie.voteAverage.toFixed(1)}` : "";

  // Create poster URLs for different sizes
  const posterUrlSmall = movie.posterPath ? `https://image.tmdb.org/t/p/w154${movie.posterPath}` : null;

  const posterUrlLarge = movie.posterPath ? `https://image.tmdb.org/t/p/w342${movie.posterPath}` : null;

  // Update the getStatusIndicator function
  const getStatusIndicator = (mediaInfo?: MediaInfo) => {
    if (!mediaInfo) return "";

    // Handle all status cases
    switch (mediaInfo.status) {
      case 1:
        return "❓"; // Unknown
      case 2:
        return "📝"; // Requested
      case 3:
        return "⏳"; // Pending
      case 4:
        return "⚡"; // Partially Available
      case 5:
        return "✅"; // Available
      default:
        return "";
    }
  };

  const requestStatus = getStatusIndicator(movie.mediaInfo);

  // Get media type display
  const mediaTypeDisplay = (() => {
    switch (movie.mediaType?.toLowerCase()) {
      case "movie":
        return "🎬 Movie";
      case "tv":
        return "📺 TV Show";
      case "person":
        return "👤 Person";
      default:
        return movie.mediaType ? `📌 ${movie.mediaType}` : "Unknown";
    }
  })();

  const accessories = [
    { text: year ? year.toString() : "" },
    { text: rating },
    { text: mediaTypeDisplay },
    { text: requestStatus },
  ].filter((acc) => acc.text !== "");

  // Add this function to check if media is already requested or available
  const isMediaRequested = (mediaInfo?: MediaInfo) => {
    if (!mediaInfo) return false;
    return [2, 3, 4, 5].includes(mediaInfo.status);
  };

  return (
    <List.Item
      icon={posterUrlSmall}
      title={title}
      subtitle={movie.overview || "No overview available"}
      accessories={accessories}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Title" text={title} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Release Year" text={year.toString()} />
              <List.Item.Detail.Metadata.Label title="Rating" text={rating} />
              <List.Item.Detail.Metadata.Label title="Media Type" text={mediaTypeDisplay} />
              <List.Item.Detail.Metadata.Label title="Status" text={requestStatus} />
              <List.Item.Detail.Metadata.Label
                title="Popularity"
                text={typeof movie.popularity === "number" ? movie.popularity.toFixed(1) : "N/A"}
              />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Overview" text={movie.overview || "No overview available"} />
            </List.Item.Detail.Metadata>
          }
        >
          {posterUrlLarge && <List.Item.Detail.Image source={posterUrlLarge} />}
        </List.Item.Detail>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="View Details"
              target={<MovieDetail movie={movie} />}
              shortcut={{ modifiers: ["cmd"], key: "return" }}
            />
            {!isMediaRequested(movie.mediaInfo) && (
              <Action.Push
                title="Request Media"
                target={<RequestForm movie={movie} />}
                shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
              />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
