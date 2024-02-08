import { useState, useEffect } from "react";
import { List, ActionPanel, Action, showToast, ToastStyle, getPreferenceValues } from "@raycast/api";
import axios from "axios";

const preferences = getPreferenceValues();
const API_KEY = preferences.apiKey;
const API_URL = preferences.apiUrl; // Add this line to use the API URL from user preferences
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w154";

interface SearchResult {
  id: number;
  title: string;
  mediaType: string;
  posterPath: string;
  releaseDate: string;
  rating?: string; // Add rating to the SearchResult interface if available from the API
  overview?: string; // Add description to the SearchResult interface if available from the API
  numberOfSeasons?: number; // Add number of seasons to the SearchResult interface if available from the API
}

interface DetailedInfo {
  markdown: string;
}

export default function SearchMoviesAndTVShows() {
  const [query, setQuery] = useState<string>("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedItem, setSelectedItem] = useState<number | null>(null);
  const [detailedInfo, setDetailedInfo] = useState<DetailedInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (query.length > 0) {
      performSearch(query);
    } else {
      setResults([]);
    }
  }, [query]);

  useEffect(() => {
    if (selectedItem !== null) {
      fetchDetails(selectedItem, "show");
    }
  }, [selectedItem]);

  const performSearch = async (query: string) => {
    setLoading(true);
    const searchResults = await search(query);
    setResults(searchResults);
    // Set the first result as the selected item, if there are any results
    if (searchResults.length > 0) {
      setSelectedItem(searchResults[0].id);
    } else {
      setSelectedItem(null); // Reset selection if there are no results
    }
    setLoading(false);
  };

  const fetchDetails = async (id: number, mediaType: string) => {
    try {
      const endpoint = mediaType === "show" ? `/tv/${id}` : `/movie/${id}`;
      const response = await axios.get(`${API_URL}${endpoint}`, {
        headers: {
          "X-Api-Key": API_KEY,
        },
      });

      if (response.data) {
        setDetailedInfo({
          markdown: `
            ![Poster](${response.data.posterPath})
            ## Description
            ${response.data.overview || "No description available."}
            ## Release Date
            ${response.data.releaseDate}
            ## Rating
            ${response.data.rating || "Not rated"}
            ${mediaType === "show" && response.data.numberOfSeasons ? `## Number of Seasons\n${response.data.numberOfSeasons}` : ""}
          `,
        });
      }
    } catch (error) {
      console.error("Error fetching details:", error);
      showToast(ToastStyle.Failure, "Failed to fetch details");
    }
  };

  return (
    <List
      isShowingDetail
      isLoading={loading}
      searchBarPlaceholder="Search movies and TV shows..."
      onSearchTextChange={setQuery}
    >
      {results.map((result) => (
        <List.Item
          key={result.id}
          title={result.title || "Unknown Title"}
          accessories={[{ text: result.mediaType === "movie" ? "Movie" : "Show" }]}
          detail={
            <List.Item.Detail
              markdown={`![Poster](${IMAGE_BASE_URL}${result.posterPath})`}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Title" text={result.title || "Unknown Title"} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="Description"
                    text={result.overview || "No description available."}
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="Release Date"
                    text={
                      result.releaseDate
                        ? new Date(result.releaseDate).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            timeZone: "UTC",
                          })
                        : "Unknown"
                    }
                  />
                  {result.mediaType === "tv" && (
                    <>
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label
                        title="Number of Seasons"
                        text={result.numberOfSeasons?.toString() || "N/A"}
                      />
                    </>
                  )}
                  {result.rating && (
                    <>
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label
                        title="Rating"
                        text={`${(Number(result.rating) * 10).toFixed(0)}%`}
                      />
                    </>
                  )}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              {result.mediaType === "movie" ? (
                <Action
                  title="Request"
                  onAction={() => requestItem(result.mediaType, result.id, undefined, result.title)}
                />
              ) : (
                <>
                  <ActionPanel.Submenu title="Request Season...">
                    {[...Array(result.numberOfSeasons)].map((_, index) => (
                      <Action
                        key={index}
                        title={`Season ${index + 1}`}
                        onAction={() => requestItem(result.mediaType, result.id, index + 1, result.title)}
                      />
                    ))}
                  </ActionPanel.Submenu>
                  <Action
                    title="Request All Seasons"
                    onAction={() => requestItem(result.mediaType, result.id, undefined, result.title)}
                  />
                </>
              )}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

async function fetchTvShowDetails(tvId: number): Promise<any> {
  try {
    const response = await axios.get(`${API_URL}/tv/${tvId}`, {
      headers: {
        "X-Api-Key": API_KEY,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching TV show details:", error);
    showToast(ToastStyle.Failure, "Failed to fetch TV show details");
    return null;
  }
}

// Function to handle media request notifications
const handleMediaRequestNotification = (mediaType: string, mediaName: string, season?: number) => {
  if (season) {
    showToast({
      style: ToastStyle.Success,
      title: `Successfully requested ${mediaName} season ${season}`,
    });
  } else {
    showToast({
      style: ToastStyle.Success,
      title: `Successfully requested ${mediaName}`,
    });
  }
};

// Function to handle media request errors
const handleMediaRequestError = () => {
  showToast({
    style: ToastStyle.Failure,
    title: "Failed to request",
  });
};

// Updated function to request all seasons
async function requestAllSeasons(tvId: number) {
  try {
    const tvShowDetails = await fetchTvShowDetails(tvId);
    const totalSeasons = tvShowDetails.numberOfSeasons; // Assuming this is the correct property

    // Log the totalSeasons value
    console.log("Total Seasons:", totalSeasons);

    const payload = {
      mediaType: "tv",
      mediaId: tvId,
      seasons: Array.from({ length: totalSeasons }, (_, i) => i + 1),
    };

    const response = await axios.post(`${API_URL}/request`, payload, {
      headers: {
        "X-Api-Key": API_KEY,
        "Content-Type": "application/json",
      },
    });

    if (response.status === 200 || response.status === 201) {
      console.log("Request successful", response.data);
    } else {
      console.error("Request failed with status:", response.status);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

// Function to make a request for the selected item
// Function to make a request for the selected item
const requestItem = async (mediaType: string, mediaId: number, seasonNumber?: number, title?: string) => {
  try {
    let payload: { mediaType: string; mediaId: number; seasons?: number[] } = {
      mediaType: mediaType,
      mediaId: mediaId,
    };

    // Check if the request is for all seasons of a TV show
    if (mediaType === "tv" && seasonNumber === undefined) {
      console.log(`Requesting all seasons for TV show with ID ${mediaId}`);
      const tvShowDetails = await fetchTvShowDetails(mediaId); // Assuming fetchTvShowDetails is a function that fetches TV show details including the number of seasons
      const totalSeasons = tvShowDetails.numberOfSeasons;
      payload.seasons = Array.from({ length: totalSeasons }, (_, i) => i + 1);
    } else if (mediaType === "tv" && typeof seasonNumber === "number") {
      // If requesting a specific season of a TV show
      console.log(`Requesting TV show with ID ${mediaId}, season ${seasonNumber}`);
      payload.seasons = [seasonNumber];
    }

    console.log("Payload for request:", payload);

    const response = await axios.post(`${API_URL}/request`, payload, {
      headers: {
        "X-Api-Key": API_KEY,
        "Content-Type": "application/json",
      },
    });

    if (response.status === 200 || response.status === 201) {
      console.log(
        `Request successful for ${title || "the item"} with ID: ${mediaId}${seasonNumber ? `, season: ${seasonNumber}` : ""}`,
      );
      // Assuming handleMediaRequestNotification is a function to show success notification
      handleMediaRequestNotification(mediaType, title || "", seasonNumber);
    } else {
      console.error("Request failed with status:", response.status);
      // Assuming handleMediaRequestError is a function to show error notification
      handleMediaRequestError();
    }
  } catch (error) {
    console.error("Error making request:", error);
    handleMediaRequestError();
  }
};

async function search(query: string): Promise<SearchResult[]> {
  try {
    const response = await axios.get(`${API_URL}/search?query=${encodeURIComponent(query)}`, {
      headers: {
        "X-Api-Key": API_KEY,
      },
    });

    const searchResults: SearchResult[] = await Promise.all(
      response.data.results.map(async (item: any) => {
        // If the media type is 'tv', fetch additional details
        let numberOfSeasons = null;
        if (item.mediaType === "tv") {
          const tvDetails = await fetchTvShowDetails(item.id);
          numberOfSeasons = tvDetails?.numberOfSeasons || null;
        }

        return {
          id: item.id,
          title: item.title || item.name,
          mediaType: item.mediaType,
          posterPath: item.posterPath,
          releaseDate: item.releaseDate || item.firstAirDate,
          rating: item.voteAverage,
          overview: item.overview,
          numberOfSeasons, // This will include the number of seasons if it's a TV show
        };
      }),
    );

    return searchResults;
  } catch (error) {
    console.error("Error fetching search results:", error);
    showToast(ToastStyle.Failure, "Failed to fetch search results");
    return [];
  }
}
