import { showFailureToast, useFetch } from "@raycast/utils";
import { Toast } from "@raycast/api";
import { Media, Episode, Stream, MediaType, SearchResponse, SeriesDetailResponse, StreamResponse } from "../types";

export function useStremioApi(baseUrl: string) {
  const getBaseStreamUrl = (): string => {
    if (!baseUrl) return "";
    const cleanedBaseUrl = baseUrl.replace(/\/manifest\.json$/, "").replace(/^stremio:\/\//, "");
    return `${cleanedBaseUrl}/stream`;
  };

  const getSearchUrl = (type: MediaType, query: string): string => {
    return `https://v3-cinemeta.strem.io/catalog/${type}/all/search=${encodeURIComponent(query)}.json`;
  };

  const getTrendingUrl = (type: MediaType): string => {
    return `https://v3-cinemeta.strem.io/catalog/${type}/top.json`;
  };

  const useSearch = (mediaType: MediaType, searchText: string) => {
    return useFetch<Media[]>(searchText.length > 0 ? getSearchUrl(mediaType, searchText) : "", {
      parseResponse: parseSearchResponse,
      onError: (error) => {
        showFailureToast({ style: Toast.Style.Failure, title: "Failed to search", message: String(error) });
        console.error("Search error:", error);
      },
      execute: searchText.length > 0,
    });
  };

  const useTrending = (mediaType: MediaType) => {
    return useFetch<Media[]>(getTrendingUrl(mediaType), {
      parseResponse: parseSearchResponse,
      onError: (error) => {
        showFailureToast({ style: Toast.Style.Failure, title: "Failed to load trending", message: String(error) });
        console.error("Trending error:", error);
      },
      execute: Boolean(mediaType),
    });
  };

  const useSeriesDetails = (media: Media | null, selectedEpisode: Episode | null) => {
    return useFetch<Episode[]>(
      media && media.type === "series" ? `https://v3-cinemeta.strem.io/meta/${media.type}/${media.imdb_id}.json` : "",
      {
        parseResponse: parseSeriesResponse,
        onError: (error) => {
          showFailureToast({
            style: Toast.Style.Failure,
            title: "Failed to load series details",
            message: String(error),
          });
        },
        execute: media !== null && media.type === "series" && !selectedEpisode,
      },
    );
  };

  const useStreams = (media: Media | null, episode: Episode | null) => {
    const getStreamUrl = (): string => {
      if (!media) return "";

      const baseStreamUrl = getBaseStreamUrl();
      if (!baseStreamUrl) return "";

      if (media.type === "movie") {
        return `${baseStreamUrl}/${media.type}/${media.id}.json`;
      } else if (episode) {
        return `${baseStreamUrl}/${media.type}/${episode.id}.json`;
      }
      return "";
    };

    const streamUrl = getStreamUrl();

    return useFetch<Stream[]>(streamUrl, {
      parseResponse: parseStreamResponse,
      onError: (error) => {
        showFailureToast({ style: Toast.Style.Failure, title: "Failed to load streams", message: String(error) });
      },
      // Simplified execute condition
      execute: Boolean(streamUrl && media && (media.type === "movie" || episode)),
    });
  };

  return {
    useSearch,
    useSeriesDetails,
    useStreams,
    useTrending,
  };
}

// Parse functions
async function parseSearchResponse(response: Response): Promise<Media[]> {
  if (!response.ok) {
    throw new Error(response.statusText);
  }

  const json = (await response.json()) as SearchResponse;

  return json.metas.map((meta) => ({
    id: meta.id,
    imdb_id: meta.imdb_id,
    type: meta.type as MediaType,
    name: meta.name,
    releaseInfo: meta.releaseInfo,
    poster: meta.poster,
    defaultVideoId: meta.behaviorHints?.defaultVideoId,
  }));
}

async function parseSeriesResponse(response: Response): Promise<Episode[]> {
  if (!response.ok) {
    throw new Error(response.statusText);
  }
  const json = (await response.json()) as SeriesDetailResponse;

  return json.meta.videos.map((video) => ({
    id: video.id,
    name: video.name,
    season: video.season,
    number: video.number,
    releaseInfo: new Date(video.firstAired).toLocaleDateString(),
    description: video.description,
    thumbnail: video.thumbnail,
  }));
}

async function parseStreamResponse(response: Response): Promise<Stream[]> {
  const json = (await response.json()) as StreamResponse;

  if (!json.streams || !Array.isArray(json.streams)) {
    return [];
  }
  const parsedStreams = json.streams.map((stream) => ({
    ...stream,
    title: stream.title || stream.description || stream.name || "Unknown Stream Name",
  }));

  if (!response.ok) {
    throw new Error(response.statusText);
  }

  return parsedStreams;
}
