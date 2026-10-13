export type EntryKind = "app" | "file" | "url" | "shell";

export interface Entry {
  id: string;
  /** Single key that triggers this entry inside its layer. */
  key: string;
  title: string;
  kind: EntryKind;
  /** App bundle path, URL or deeplink (including `raycast://`), file path, or shell command. */
  value: string;
  keywords?: string[];
}

export interface Layer {
  /** Stable slug, carried in the layer's Quicklink as the launch context. */
  id: string;
  name: string;
  icon?: string;
  /** Optional key-tag color. Falls back to a neutral gray. */
  color?: string;
  entries: Entry[];
}

export type KeyMode = "instant" | "search";

export const STORAGE_KEY = "layers";

export const ENTRY_KINDS: EntryKind[] = ["app", "file", "url", "shell"];
