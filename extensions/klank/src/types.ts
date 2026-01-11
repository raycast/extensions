/**
 * Types for the Klank Raycast extension
 * These mirror the types from @klank/command
 */

export type SearchableItemType =
  | "track"
  | "album"
  | "playlist"
  | "team"
  | "tour"
  | "event"
  | "demo"
  | "navigation"
  | "action"
  | "contact"
  | "import"
  | "account"
  | "public"
  | "filter";

export interface SearchableItem {
  id: string;
  title: string;
  subtitle?: string;
  type: SearchableItemType;
  url?: string;
  priority?: number;
  keywords?: string[];
  category?: string;
  status?: string | null;
  avatarUrl?: string | null;
  teamColor?: string | null;
  teamName?: string;
  disabled?: boolean;
  disabledReason?: string;
  upgradeUrl?: string;
  iconKey?: string;
}

export interface SearchAPIResponse {
  items: SearchableItem[];
  user?: {
    id: string;
    email: string;
  };
  error?: string;
}

export interface Preferences {
  apiUrl: string;
  accessToken: string;
}
