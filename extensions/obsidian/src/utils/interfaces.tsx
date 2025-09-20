import { Image } from "@raycast/api";
import { Note } from "../api/vault/notes/notes.types";
import { Vault } from "../api/vault/vault.types";

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
  action?: (note: Note, vault: Vault) => React.ReactNode;
  onDelete?: (note: Note, vault: Vault) => void;
  onSearchChange?: (search: string) => void;
}
