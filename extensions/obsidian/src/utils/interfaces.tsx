import { Image } from "@raycast/api";
import { NoteAction } from "./constants";

//--------------------------------------------------------------------------------
// All interfaces for all commands should be defined here.
//--------------------------------------------------------------------------------

//--------------------------------------------------------------------------------
// Preference interfaces
//--------------------------------------------------------------------------------

export interface GlobalPreferences {
  vaultPath: string;
}

export interface QuickLookPreferences {
  removeYAML: boolean;
  removeLinks: boolean;
  removeLatex: boolean;
}

export interface AppendNotePreferences {
  appendTemplate: string;
  appendSelectedTemplate: string;
}
export interface NoteFormPreferences extends GlobalPreferences {
  prefPath: string;
  prefNoteName: string;
  prefNoteContent: string;
  fillFormWithDefaults: boolean;
  prefTag: string;
  tags: string;
  openOnCreate: boolean;
  folderActions: string;
}

export interface SearchNotePreferences extends GlobalPreferences, QuickLookPreferences, AppendNotePreferences {
  primaryAction: string;
  excludedFolders: string;
  showDetail: boolean;
  showMetadata: boolean;
  searchContent: boolean;
}

export interface RandomNotePreferences extends GlobalPreferences, QuickLookPreferences, AppendNotePreferences {}

export interface SearchMediaPreferences extends GlobalPreferences {
  imageSize: string;
  excludedFolders: string;
}

//--------------------------------------------------------------------------------
// Other interfaces
//--------------------------------------------------------------------------------

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

export interface PinnedNotesJSON {
  vaultPath: string;
  pinnedNotes: string[];
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
  notes: Note[] | undefined;
  allNotes?: Note[];
  setNotes?: (notes: Note[]) => void;
  isLoading?: boolean;
  searchArguments: SearchArguments;
  action?: (note: Note, vault: Vault, actionCallback: (action: NoteAction) => void) => React.ReactFragment;
  onDelete?: (note: Note, vault: Vault) => void;
  onSearchChange?: (search: string) => void;
}
