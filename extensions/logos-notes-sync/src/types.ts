export interface LogosNote {
  id: string;
  revision: string;
  created: string;
  createdBy: string;
  modified: string;
  isTrashed: boolean;
  isDeleted: boolean;
  noteKind: "highlight" | "note";
  content?: string;
  anchors: NoteAnchor[];
  style?: NoteStyle;
  role: string;
}

export interface NoteAnchor {
  textRange: TextRange;
  previewRichText?: string;
}

export interface TextRange {
  resourceId: string;
  resourceTitle?: string;
  resourceFullTitle?: string;
  reference?: {
    display: string;
    raw: string;
  };
  version: string;
  offset: number;
  length: number;
}

export interface NoteStyle {
  indicator: string;
  color: string;
  highlight: string;
  markupStyle: string;
}

export interface NotesApiResponse {
  notes: LogosNote[];
  moreNotes: boolean;
  morePreviousNotes: boolean;
  firstNoteKey: string | null;
  nextNoteKey: string | null;
  noteTotal: number;
  facets: Facet[];
}

export interface Facet {
  field: string;
  label: string;
  terms: FacetTerm[];
}

export interface FacetTerm {
  value: string;
  label: string;
  count: number;
}

export interface ProcessedNote {
  id: string;
  kind: string;
  created: string;
  modified: string;
  text: string;
  reference: string | null;
  referenceRaw: string | null;
  resourceId: string;
  resourceTitle: string;
  color: string | null;
  offset: number | null;
}

export interface Preferences {
  obsidianVaultPath: string;
  excludedResources: string;
  includeHighlightColor: boolean;
  readwiseToken: string;
  syncToReadwise: boolean;
  autoSyncEnabled: boolean;
}

export interface AuthTokens {
  accessToken: string;
  accessTokenSecret: string;
  expiresAt?: number;
}
