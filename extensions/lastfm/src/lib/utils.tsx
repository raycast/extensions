import { Image, ImageSizes } from "../types";
import { environment } from "@raycast/api";
import { join } from "path";

export const getErrorMessage = (errorNumber: number): string => {
  switch (errorNumber) {
    case 6:
      return "User not found. Please check your Last.fm username in preferences.";
    case 10:
      return "Invalid API key. Please check your Last.fm API key in preferences.";
    case 29:
      return "Rate limit exceeded. Please wait a while before trying again.";
    case 17:
      return "Authentication required. Auth login required for this operation";
    default:
      return `Unknown Last.fm API error (code: ${errorNumber}).`;
  }
};

export const PlaceholderCover = join(environment.assetsPath, `placeholder.jpeg`);

export const getCoverUrlsBySize = (coverSizes?: Image[]) => {
  const result: Record<ImageSizes, string> = {
    small: PlaceholderCover,
    medium: PlaceholderCover,
    large: PlaceholderCover,
    extralarge: PlaceholderCover,
  };

  if (!coverSizes || !Array.isArray(coverSizes)) {
    return result;
  }

  for (const cover of coverSizes) {
    if (cover["#text"] !== "" && cover["#text"] != null) {
      const url = cover["#text"] ? cover["#text"] : PlaceholderCover;
      result[cover.size as ImageSizes] = url;
    }
  }

  return result;
};

type actionType = "artist" | "song" | "album";

type ServiceActionProps = {
  term: string;
  type: actionType;
};

const blocks = [
  {
    service: "spotify",
    search: ({ term, type }: ServiceActionProps) => {
      const pathMaps = {
        artist: "artists",
        album: "albums",
        song: "tracks",
      };

      return {
        url: `https://open.spotify.com/search/${encodeURIComponent(term)}/${pathMaps[type]}`,
        label: `Search on Spotify`,
      };
    },
  },
  {
    service: "apple",
    search: ({ term }: ServiceActionProps) => {
      return {
        url: `https://music.apple.com/search?term=${encodeURIComponent(term)}`,
        label: `Search on Apple Music`,
      };
    },
  },
  {
    service: "youtube",
    search: ({ term }: ServiceActionProps) => {
      return {
        url: `https://www.youtube.com/results?search_query=${encodeURIComponent(term)}`,
        label: `Search on Youtube`,
      };
    },
  },
];

export function generateMusicServiceAction(params: ServiceActionProps) {
  return blocks.map((block) => block.search(params));
}
