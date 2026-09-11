import { Color, Icon } from "@raycast/api";
import { BreadcrumbState, BrowseView } from "./types";

export function getBreadcrumb(state: BreadcrumbState): string | undefined {
  const parts: string[] = [];
  if (state.artist) {
    parts.push(state.artist.name);
  }
  if (state.album) {
    parts.push(state.album.name);
  }
  if (state.playlist) {
    parts.push(state.playlist.name);
  }
  return parts.length > 0 ? parts.join(" > ") : undefined;
}

export function getBrowseSubtitle(view: BrowseView, breadcrumb?: string): string | undefined {
  if (view === "artists") return "Artists";
  if (view === "albums") return "Albums";
  if (view === "playlists") return "Playlists";
  return breadcrumb;
}

export function getRecentlyPlayedIcon(uri: string) {
  if (uri.includes("artist")) return { source: Icon.Person, tintColor: Color.Blue };
  if (uri.includes("album")) return { source: Icon.Music, tintColor: Color.Green };
  if (uri.includes("playlist")) return { source: Icon.Layers, tintColor: Color.Purple };
  return { source: Icon.Terminal, tintColor: Color.Orange };
}
