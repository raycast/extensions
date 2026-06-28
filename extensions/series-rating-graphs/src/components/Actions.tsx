import {
  Action,
  Alert,
  Icon,
  Keyboard,
  Toast,
  confirmAlert,
  getPreferenceValues,
  openExtensionPreferences,
  showInFinder,
  showToast,
} from "@raycast/api";
import { SearchResult } from "../types";
import ShowDetail from "./ShowDetail";
import { useEffect, useState } from "react";
import { copyImage, downloadImage } from "../utils/image";

const preferences = getPreferenceValues();
const tmdbAccessToken = preferences.tmdbAccessToken;

function useTmdbId(imdbId: string) {
  const [tmdbId, setTmdbId] = useState("");

  useEffect(() => {
    (async () => {
      const url = `https://api.themoviedb.org/3/find/${imdbId}?external_source=imdb_id`;
      const tmdbIdRes = (await (
        await fetch(url, {
          headers: {
            Authorization: `Bearer ${tmdbAccessToken}`,
          },
        })
      ).json()) as { tv_results: { id: number }[] };
      const tmdbId = String(tmdbIdRes?.tv_results?.[0]?.id);
      setTmdbId(tmdbId);
    })();
  }, [imdbId]);

  return tmdbId;
}

const handleNoTmdbAccessTokenAlert = async () => {
  const options: Alert.Options = {
    title: "No TMDB Access Token set",
    icon: Icon.Key,
    message: "Set your TMDB Access Token in the extension preferences.",
    primaryAction: {
      title: "Open Preferences",
      onAction: () => {
        openExtensionPreferences();
      },
    },
  };
  await confirmAlert(options);
};

export function ActionShowDetails({ show }: { show: SearchResult }) {
  return (
    <Action.Push
      title="Show Details"
      icon={Icon.AppWindow}
      target={<ShowDetail show={show} originalTitle={show.originalTitle} />}
    />
  );
}

export function ActionOpenSeriesGraphPage({
  imdbId,
  shortcut,
}: {
  imdbId: string;
  shortcut: Keyboard.Shortcut | undefined;
}) {
  const tmdbId = useTmdbId(imdbId);

  return tmdbAccessToken ? (
    <Action.OpenInBrowser
      title="Open SeriesGraph Page"
      icon={{ source: "seriesgraph.png" }}
      url={`https://seriesgraph.com/show/${tmdbId}`}
      {...(shortcut && { shortcut })}
    />
  ) : (
    <Action
      title="Open SeriesGraph Page"
      icon={{ source: "seriesgraph.png" }}
      onAction={handleNoTmdbAccessTokenAlert}
      {...(shortcut && { shortcut })}
    />
  );
}

export function ActionOpenImdbPage({ imdbId, shortcut }: { imdbId: string; shortcut: Keyboard.Shortcut | undefined }) {
  return (
    <Action.OpenInBrowser
      title="Open IMDb Page"
      icon={{ source: "imdb.png" }}
      url={`https://imdb.com/title/${imdbId}`}
      {...(shortcut && { shortcut })}
    />
  );
}

export function ActionOpenTmdbPage({ imdbId, shortcut }: { imdbId: string; shortcut: Keyboard.Shortcut | undefined }) {
  const tmdbId = useTmdbId(imdbId);

  return tmdbAccessToken ? (
    <Action.OpenInBrowser
      title="Open TMDB Page"
      icon={{ source: "tmdb.png" }}
      url={`https://themoviedb.org/tv/${tmdbId}`}
      {...(shortcut && { shortcut })}
    />
  ) : (
    <Action
      title="Open TMDB Page"
      icon={{ source: "tmdb.png" }}
      onAction={handleNoTmdbAccessTokenAlert}
      {...(shortcut && { shortcut })}
    />
  );
}

export function ActionPrevPage({
  tablePageIndex,
  setTablePageIndex,
}: {
  tablePageIndex: number;
  setTablePageIndex: React.Dispatch<React.SetStateAction<number>>;
}) {
  return (
    <Action
      title="Previous Page"
      icon={Icon.ArrowLeft}
      onAction={() => setTablePageIndex(tablePageIndex - 1)}
      shortcut={{
        macOS: { modifiers: [], key: "arrowLeft" },
        Windows: { modifiers: [], key: "arrowLeft" },
      }}
    />
  );
}

export function ActionNextPage({
  tablePageIndex,
  setTablePageIndex,
}: {
  tablePageIndex: number;
  setTablePageIndex: React.Dispatch<React.SetStateAction<number>>;
}) {
  return (
    <Action
      title="Next Page"
      icon={Icon.ArrowRight}
      onAction={() => setTablePageIndex(tablePageIndex + 1)}
      shortcut={{
        macOS: { modifiers: [], key: "arrowRight" },
        Windows: { modifiers: [], key: "arrowRight" },
      }}
    />
  );
}

export function ActionCopyPoster({ posterUrl }: { posterUrl: string }) {
  return (
    <Action
      title="Copy Poster"
      icon={Icon.Clipboard}
      onAction={async () => {
        const toast = await showToast({
          title: "Copying poster…",
          style: Toast.Style.Animated,
        });
        try {
          await copyImage(posterUrl);
          (() => {
            toast.title = "Poster copied to clipboard";
            toast.style = Toast.Style.Success;
          })();
        } catch {
          (() => {
            toast.title = "Failed to copy poster";
            toast.style = Toast.Style.Failure;
          })();
        }
      }}
      shortcut={Keyboard.Shortcut.Common.Copy}
    />
  );
}

export function ActionDownloadPoster({ posterUrl }: { posterUrl: string }) {
  const preferences = getPreferenceValues<Preferences>();
  const downloadPath = preferences.downloadPath;
  const showInFinderAfterDownload = preferences.showInFinderAfterDownload;

  return (
    <Action
      title="Download Poster"
      icon={Icon.Download}
      onAction={async () => {
        const toast = await showToast({
          title: "Downloading poster…",
          style: Toast.Style.Animated,
        });
        try {
          const filePath = await downloadImage(posterUrl, downloadPath);
          (() => {
            toast.title = `Poster downloaded to ${downloadPath}`;
            toast.style = Toast.Style.Success;
          })();
          if (showInFinderAfterDownload) await showInFinder(filePath);
        } catch {
          (() => {
            toast.title = "Failed to download poster";
            toast.style = Toast.Style.Failure;
          })();
        }
      }}
      shortcut={{
        macOS: { modifiers: ["cmd"], key: "s" },
        Windows: { modifiers: ["ctrl"], key: "s" },
      }}
    />
  );
}

export function ActionToggleLayout({
  layout,
  setLayout,
}: {
  layout: string;
  setLayout: React.Dispatch<React.SetStateAction<string>>;
}) {
  return (
    <Action
      title={layout === "grid" ? "Switch to List View" : "Switch to Grid View"}
      icon={layout === "grid" ? Icon.AppWindowList : Icon.AppWindowGrid3x3}
      onAction={() => setLayout(layout === "grid" ? "list" : "grid")}
      shortcut={{
        macOS: { modifiers: ["cmd"], key: "l" },
        Windows: { modifiers: ["ctrl"], key: "l" },
      }}
    />
  );
}

export function ActionReload({ revalidate }: { revalidate: () => void }) {
  return (
    <Action
      title="Reload"
      icon={Icon.ArrowClockwise}
      onAction={() => revalidate()}
      shortcut={{
        macOS: { modifiers: ["cmd"], key: "r" },
        Windows: { modifiers: ["ctrl"], key: "r" },
      }}
    />
  );
}
