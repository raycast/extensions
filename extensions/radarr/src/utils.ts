import type { MovieLookup, Movie } from "./types";

export function formatMovieTitle(movie: MovieLookup | Movie): string {
  return `${movie.title} (${movie.year})`;
}

export function formatFileSize(bytes: number): string {
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  if (bytes === 0) return "0 B";
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = Math.round((bytes / Math.pow(1024, i)) * 100) / 100;
  return `${size} ${sizes[i]}`;
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return `${remainingMinutes}m`;
  }

  return remainingMinutes === 0 ? `${hours}h` : `${hours}h ${remainingMinutes}m`;
}

export function formatReleaseDate(dateString?: string): string {
  if (!dateString) return "Not available";

  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
}

export function getMoviePoster(movie: MovieLookup | Movie): string | undefined {
  const posterImage = movie.images?.find(img => img.coverType === "poster");
  return posterImage?.remoteUrl || posterImage?.url;
}

export function getRatingDisplay(movie: MovieLookup | Movie): string {
  const ratings = movie.ratings;
  if (!ratings) return "";

  const parts: string[] = [];

  if (ratings.imdb?.value) {
    parts.push(`IMDb: ${ratings.imdb.value.toFixed(1)}/10`);
  }

  if (ratings.tmdb?.value) {
    parts.push(`TMDB: ${ratings.tmdb.value.toFixed(1)}/10`);
  }

  if (ratings.rottenTomatoes?.value) {
    parts.push(`RT: ${ratings.rottenTomatoes.value}%`);
  }

  return parts.join(" • ");
}

export function getMovieStatus(movie: Movie): string {
  if (movie.hasFile && movie.downloaded) {
    return "Downloaded";
  }

  if (movie.monitored) {
    return "Monitored";
  }

  switch (movie.status) {
    case "announced":
      return "Announced";
    case "inCinemas":
      return "In Cinemas";
    case "released":
      return "Released";
    case "deleted":
      return "Deleted";
    default:
      return "Unknown";
  }
}

export function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) {
    return text;
  }

  return text.substring(0, maxLength - 3) + "...";
}

export function getGenresDisplay(genres: string[]): string {
  if (!genres || genres.length === 0) {
    return "";
  }

  return genres.slice(0, 3).join(", ");
}

export function formatOverview(overview: string): string {
  if (!overview || overview.trim() === "") {
    return "No overview available";
  }

  // Split into sentences and add line breaks for better readability
  const sentences = overview.split(/(?<=[.!?])\s+/);

  // Group sentences into paragraphs (every 2-3 sentences)
  const paragraphs: string[] = [];
  for (let i = 0; i < sentences.length; i += 2) {
    const paragraph = sentences.slice(i, i + 2).join(" ");
    paragraphs.push(paragraph);
  }

  // Join paragraphs with double line breaks
  return paragraphs.join("\n\n");
}
