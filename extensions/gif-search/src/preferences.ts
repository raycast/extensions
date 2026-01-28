import { getPreferenceValues } from "@raycast/api";

export type ServiceName = "giphy" | "giphy-clips" | "tenor" | "finergifs" | "favorites" | "recents";

export const GIF_SERVICE: { [name: string]: ServiceName } = {
  GIPHY: "giphy",
  GIPHY_CLIPS: "giphy-clips",
  TENOR: "tenor",
  FINER_GIFS: "finergifs",
  FAVORITES: "favorites",
  RECENTS: "recents",
};

export function getServices() {
  return Object.values(GIF_SERVICE).filter((service) => {
    return service != GIF_SERVICE.FAVORITES && service != GIF_SERVICE.RECENTS;
  });
}

export function getServiceTitle(service?: ServiceName) {
  switch (service) {
    case GIF_SERVICE.GIPHY:
      return "GIPHY GIFs";
    case GIF_SERVICE.GIPHY_CLIPS:
      return "GIPHY Clips";
    case GIF_SERVICE.TENOR:
      return "Tenor";
    case GIF_SERVICE.FINER_GIFS:
      return "Finer Gifs Club";
  }

  return "";
}

const preferences = getPreferenceValues<Preferences>();

export function getDefaultAction(): string {
  return preferences.defaultAction;
}

export function getMaxResults(): number {
  return parseInt(preferences.maxResults, 10) ?? 20;
}

export const GRID_COLUMNS: { [key: string]: number } = {
  small: 8,
  medium: 5,
  large: 3,
};

export function getGridItemSize() {
  return preferences.gridItemSize;
}

export function getGridTrendingItemSize() {
  return preferences.gridTrendingItemSize;
}

export function getHideFilename(): boolean {
  return preferences.hideFilename;
}

export function getGiphyLocale(): string {
  return preferences.giphyLocale;
}

export function getTenorLocale(): string {
  return preferences.tenorLocale;
}
