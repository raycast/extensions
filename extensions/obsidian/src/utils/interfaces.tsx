import { Image } from "@raycast/api";

export interface Vault {
  name: string;
  key: string;
  path: string;
}

export interface Note {
  title: string;
  path: string;
  tags: string[];
  content: string;
  bookmarked: boolean;
}

export interface CodeBlock {
  language: string;
  code: string;
}

export interface FormValue {
  path: string;
  name: string;
  content: string;
  tags: string[];
}
interface ObsidianVaultJSON {
  path: string;
  ts: number;
  open: boolean;
}

export interface ObsidianJSON {
  vaults: Record<string, ObsidianVaultJSON>;
}

export interface ObsidianVaultsState {
  ready: boolean;
  vaults: Vault[];
}

export interface SearchArguments {
  searchArgument: string;
  tagArgument: string;
}

export interface Media {
  title: string;
  path: string;
  icon: Image;
}

export interface MediaState {
  ready: boolean;
  media: Media[];
}

export interface MediaSearchArguments {
  searchArgument: string;
  typeArgument: string;
}

export interface NoteListProps {
  title?: string;
  vault: Vault;
  notes: Note[];
  isLoading?: boolean;
  searchArguments: SearchArguments;
  action?: (note: Note, vault: Vault) => React.ReactFragment;
  onDelete?: (note: Note, vault: Vault) => void;
  onSearchChange?: (search: string) => void;
}
