import { Application } from "@raycast/api";

// --- Saved Sites ---

export interface SavedSite {
  title: string;
  /** URL template with `{}` as query placeholder, e.g. "https://google.com/search?q={}" */
  url: string;
  /** Bundle ID of preferred browser for this site, or undefined for global default */
  preferredBrowserBundleId?: string;
}

export type FormData = SavedSite & { isDefault: boolean };

export interface SavedSites {
  items: SavedSite[];
  defaultSiteTitle?: string;
}

export interface SavedSitesState {
  savedSites: SavedSites;
  setSavedSites: (sites: SavedSites) => void;
}

// --- Browser Info ---

export interface BrowserInfo {
  name: string;
  bundleId: string;
  path: string;
  /** Resolved application object from Raycast API */
  application: Application;
}

// --- Editing ---

export type SavedSitesEditingKind = { type: "edit"; index: number } | { type: "add" };

export type SavedSitesAction =
  | (({ type: "edit"; index: number; oldIsDefault: boolean } | { type: "add" }) & {
      newTitle: string;
      newUrl: string;
      newIsDefault: boolean;
      newPreferredBrowserBundleId?: string;
    })
  | { type: "delete"; index: number };
