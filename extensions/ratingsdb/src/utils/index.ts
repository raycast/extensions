import { Media, StreamingProvider } from "../types";
import icons from "../../assets/icons.json";

export const getRottenTomatoesUrl = (media: Media): string => {
  const formattedTitle = encodeURIComponent(media.Title.toLowerCase().replace(/[^a-z0-9]+/g, "_"));
  if (media.Type === "movie") {
    return `https://www.rottentomatoes.com/m/${formattedTitle}`;
  } else if (media.Type === "series") {
    return `https://www.rottentomatoes.com/tv/${formattedTitle}`;
  } else {
    return "";
  }
};

export const getIMDBUrl = (media: Media): string => {
  if (media.imdbID) {
    return `https://www.imdb.com/title/${media.imdbID}`;
  } else {
    return "";
  }
};
export const getMetacriticUrl = (media: Media): string => {
  const formattedTitle = encodeURIComponent(media.Title.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
  if (media.Type === "movie") {
    return `https://www.metacritic.com/movie/${formattedTitle}`;
  } else if (media.Type === "series") {
    return `https://www.metacritic.com/tv/${formattedTitle}`;
  } else {
    return "";
  }
};
export const sortTitles = (titles: Media[], order: string) => {
  switch (order) {
    case "mostRecent":
      return [...titles].sort((a, b) => parseInt(b.Year) - parseInt(a.Year));
    case "alphabetical":
      return [...titles].sort((a, b) => a.Title.localeCompare(b.Title));
    default:
      return titles;
  }
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
};

export const getProviderIcon = (provider: StreamingProvider): string => {
  return icons.find((icon) => icon.id === provider.source_id)?.logo_100px ?? "";
};
