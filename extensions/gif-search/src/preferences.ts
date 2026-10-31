import { getPreferenceValues } from "@raycast/api";

export type ServiceName =
  | "giphy"
  | "giphy-clips"
  | "giphy-stickers"
  | "klipy"
  | "klipy-stickers"
  | "klipy-clips"
  | "klipy-memes"
  | "finergifs"
  | "favorites"
  | "recents"
  | "all";

export const GIF_SERVICE: { [name: string]: ServiceName } = {
  GIPHY: "giphy",
  GIPHY_CLIPS: "giphy-clips",
  GIPHY_STICKERS: "giphy-stickers",
  KLIPY: "klipy",
  KLIPY_STICKERS: "klipy-stickers",
  KLIPY_CLIPS: "klipy-clips",
  KLIPY_MEMES: "klipy-memes",
  FINER_GIFS: "finergifs",
  FAVORITES: "favorites",
  RECENTS: "recents",
  ALL: "all",
};

export function isServiceName(service?: string): service is ServiceName {
  return Object.values(GIF_SERVICE).includes(service as ServiceName);
}

export function getServices() {
  return Object.values(GIF_SERVICE).filter((service) => {
    return service != GIF_SERVICE.FAVORITES && service != GIF_SERVICE.RECENTS && service != GIF_SERVICE.ALL;
  });
}

// GIPHY Clips and Stickers are a different kind of media, and Finer Gifs only covers The Office, so All Sources skips them.
export function getAllSourcesServices(): ServiceName[] {
  return [
    GIF_SERVICE.GIPHY,
    GIF_SERVICE.KLIPY,
    GIF_SERVICE.KLIPY_STICKERS,
    GIF_SERVICE.KLIPY_CLIPS,
    GIF_SERVICE.KLIPY_MEMES,
  ];
}

export function getServiceTitle(service?: ServiceName) {
  switch (service) {
    case GIF_SERVICE.GIPHY:
      return "GIPHY GIFs";
    case GIF_SERVICE.GIPHY_CLIPS:
      return "GIPHY Clips";
    case GIF_SERVICE.GIPHY_STICKERS:
      return "GIPHY Stickers";
    case GIF_SERVICE.KLIPY:
      return "Klipy";
    case GIF_SERVICE.KLIPY_STICKERS:
      return "Klipy Stickers";
    case GIF_SERVICE.KLIPY_CLIPS:
      return "Klipy Clips";
    case GIF_SERVICE.KLIPY_MEMES:
      return "Klipy Memes";
    case GIF_SERVICE.FINER_GIFS:
      return "Finer Gifs Club";
    case GIF_SERVICE.ALL:
      return "All Sources";
  }

  return "";
}

const preferences = getPreferenceValues<Preferences>();

export function getDefaultAction(): string {
  return getPreferenceValues<Preferences>().defaultAction;
}

export function getMaxResults(): number {
  const maxResults = Number(preferences.maxResults);
  return Number.isSafeInteger(maxResults) && maxResults > 0 ? maxResults : 20;
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

export function getKlipyLocale(): string {
  return preferences.klipyLocale;
}
