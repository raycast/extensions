import {
  Action,
  ActionPanel,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { Movie } from "../types/betaseries";
import {
  addMovieToList,
  markMovieAsWatched,
  markMovieAsUnwatched,
} from "../api/client";
import { useState } from "react";

interface MovieListItemProps {
  movie: Movie;
  isMyMovie?: boolean;
  onLogout?: () => void;
}

function isValidUrl(urlString: string | undefined | null): boolean {
  if (!urlString) return false;
  try {
    const url = new URL(urlString);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}

export function MovieListItem({
  movie,
  isMyMovie = false,
  onLogout,
}: MovieListItemProps) {
  const [isAdded, setIsAdded] = useState(movie.user?.status === 1);
  const [isWatched, setIsWatched] = useState(movie.user?.status === 1);

  // Use poster only if it's a valid URL, otherwise use Icon
  const iconSource =
    movie.poster && isValidUrl(movie.poster) ? movie.poster : Icon.Video;

  // Ensure we have a valid URL for the browser action
  // BetaSeries URLs follow format: /film/{id}-{slug}
  let browserUrl: string;
  if (isValidUrl(movie.url)) {
    browserUrl = movie.url;
  } else {
    const slug = generateSlug(movie.title);
    browserUrl = `https://www.betaseries.com/film/${movie.id}-${slug}`;
  }

  const handleAddToList = async () => {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Adding movie...",
      });
      await addMovieToList(movie.id);
      setIsAdded(true);
      await showToast({
        style: Toast.Style.Success,
        title: "Movie added to your list",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to add movie",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleMarkAsWatched = async () => {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Marking as watched...",
      });
      await markMovieAsWatched(movie.id);
      setIsWatched(true);
      await showToast({
        style: Toast.Style.Success,
        title: "Movie marked as watched",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update movie",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleMarkAsUnwatched = async () => {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Marking as unwatched...",
      });
      await markMovieAsUnwatched(movie.id);
      setIsWatched(false);
      await showToast({
        style: Toast.Style.Success,
        title: "Movie marked as unwatched",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update movie",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  return (
    <List.Item
      title={movie.title || "Unknown Movie"}
      subtitle={movie.production_year ? String(movie.production_year) : ""}
      icon={iconSource}
      accessories={[
        { text: movie.director || undefined },
        {
          icon: isMyMovie
            ? isWatched
              ? Icon.CheckCircle
              : Icon.Circle
            : isAdded
              ? Icon.CheckCircle
              : undefined,
        },
      ]}
      actions={
        <ActionPanel>
          {isMyMovie ? (
            <>
              {isWatched ? (
                <Action
                  title="Mark as Unwatched"
                  icon={Icon.Circle}
                  onAction={handleMarkAsUnwatched}
                />
              ) : (
                <Action
                  title="Mark as Watched"
                  icon={Icon.CheckCircle}
                  onAction={handleMarkAsWatched}
                />
              )}
              <Action.Paste
                title="Paste Movie Title"
                content={movie.title || ""}
                shortcut={{ modifiers: ["opt"], key: "v" }}
              />
              <Action.CopyToClipboard
                title="Copy Movie Title"
                content={movie.title || ""}
                shortcut={{ modifiers: ["opt"], key: "c" }}
              />
              <Action.OpenInBrowser
                title="Open in Browser"
                url={browserUrl}
                shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
              />
              {onLogout && (
                <Action
                  title="Logout"
                  icon={Icon.XMarkCircle}
                  onAction={onLogout}
                />
              )}
            </>
          ) : (
            <>
              {!isAdded && (
                <Action
                  title="Add to My Movies"
                  icon={Icon.Plus}
                  onAction={handleAddToList}
                />
              )}
              <Action.OpenInBrowser
                title="Open in Browser"
                url={browserUrl}
                shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
              />
            </>
          )}
        </ActionPanel>
      }
    />
  );
}
