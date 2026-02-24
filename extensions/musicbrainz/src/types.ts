export type EntityType = "artist" | "release" | "recording" | "release-group" | "label" | "work";

interface MBEntity {
  id: string;
  score: number;
}

interface MBLifeSpan {
  begin?: string;
  end?: string;
  ended: boolean;
}

interface MBArea {
  id: string;
  name: string;
  "sort-name": string;
  "iso-3166-1-codes"?: string[];
}

export interface MBArtistCredit {
  artist: {
    id: string;
    name: string;
    "sort-name": string;
    disambiguation?: string;
  };
  name: string;
  joinphrase?: string;
}

interface MBTag {
  count: number;
  name: string;
}

export interface MBGenre {
  id: string;
  name: string;
  count: number;
  disambiguation?: string;
}

interface MBAlias {
  name: string;
  "sort-name": string;
  type?: string;
  locale?: string;
  primary?: boolean;
}

export interface MBRelation {
  type: string;
  "type-id": string;
  direction: string;
  url?: {
    id: string;
    resource: string;
  };
  artist?: {
    id: string;
    name: string;
    "sort-name": string;
    disambiguation?: string;
    type?: string;
    country?: string;
  };
  recording?: {
    id: string;
    title: string;
    length?: number;
    video?: boolean;
    disambiguation?: string;
  };
  work?: {
    id: string;
    title: string;
    type?: string;
    language?: string;
    disambiguation?: string;
    iswcs?: string[];
  };
  target?: string;
  "target-type"?: string;
  begin?: string;
  end?: string;
  ended?: boolean;
}

// Artist

export interface MBArtist extends MBEntity {
  type?: string;
  name: string;
  "sort-name": string;
  country?: string;
  disambiguation?: string;
  "life-span"?: MBLifeSpan;
  area?: MBArea;
  "begin-area"?: MBArea;
  "end-area"?: MBArea;
  gender?: string;
  tags?: MBTag[];
  genres?: MBGenre[];
  aliases?: MBAlias[];
  relations?: MBRelation[];
  isnis?: string[];
  ipis?: string[];
}

// Release

interface MBTrack {
  id: string;
  position: number;
  number: string;
  title: string;
  length?: number;
  recording?: {
    id: string;
    title: string;
    length?: number;
  };
}

interface MBMedia {
  position: number;
  format?: string;
  title?: string;
  "track-count": number;
  tracks?: MBTrack[];
}

interface MBLabelInfo {
  "catalog-number"?: string;
  label?: {
    id: string;
    name: string;
  };
}

interface MBReleaseGroup {
  id: string;
  title: string;
  "primary-type"?: string;
  "secondary-types"?: string[];
}

export interface MBRelease extends MBEntity {
  title: string;
  status?: string;
  date?: string;
  country?: string;
  barcode?: string;
  disambiguation?: string;
  packaging?: string;
  "artist-credit"?: MBArtistCredit[];
  "release-group"?: MBReleaseGroup;
  "label-info"?: MBLabelInfo[];
  media?: MBMedia[];
  "track-count"?: number;
  "text-representation"?: {
    language?: string;
    script?: string;
  };
  tags?: MBTag[];
  relations?: MBRelation[];
}

// Recording

export interface MBRecording extends MBEntity {
  title: string;
  length?: number;
  disambiguation?: string;
  video?: boolean;
  "first-release-date"?: string;
  "artist-credit"?: MBArtistCredit[];
  releases?: MBRelease[];
  isrcs?: string[];
  tags?: MBTag[];
  relations?: MBRelation[];
}

// Release Group

export interface MBReleaseGroupFull extends MBEntity {
  title: string;
  "primary-type"?: string;
  "secondary-types"?: string[];
  "first-release-date"?: string;
  disambiguation?: string;
  "artist-credit"?: MBArtistCredit[];
  releases?: MBRelease[];
  tags?: MBTag[];
  genres?: MBGenre[];
  relations?: MBRelation[];
}

// Label

export interface MBLabel extends MBEntity {
  name: string;
  type?: string;
  country?: string;
  disambiguation?: string;
  "label-code"?: number;
  "life-span"?: MBLifeSpan;
  area?: MBArea;
  tags?: MBTag[];
  genres?: MBGenre[];
  aliases?: MBAlias[];
  relations?: MBRelation[];
  isnis?: string[];
  ipis?: string[];
}

// Work

export interface MBWork extends MBEntity {
  title: string;
  type?: string;
  language?: string;
  disambiguation?: string;
  iswcs?: string[];
  tags?: MBTag[];
  aliases?: MBAlias[];
  relations?: MBRelation[];
}

// Search response wrappers

interface MBSearchResponse {
  created: string;
  count: number;
  offset: number;
}

export interface MBArtistSearchResponse extends MBSearchResponse {
  artists: MBArtist[];
}

export interface MBReleaseSearchResponse extends MBSearchResponse {
  releases: MBRelease[];
}

export interface MBRecordingSearchResponse extends MBSearchResponse {
  recordings: MBRecording[];
}

export interface MBReleaseGroupSearchResponse extends MBSearchResponse {
  "release-groups": MBReleaseGroupFull[];
}

export interface MBLabelSearchResponse extends MBSearchResponse {
  labels: MBLabel[];
}

export interface MBWorkSearchResponse extends MBSearchResponse {
  works: MBWork[];
}

export type SearchResponse =
  | MBArtistSearchResponse
  | MBReleaseSearchResponse
  | MBRecordingSearchResponse
  | MBReleaseGroupSearchResponse
  | MBLabelSearchResponse
  | MBWorkSearchResponse;

export type SearchResult = MBArtist | MBRelease | MBRecording | MBReleaseGroupFull | MBLabel | MBWork;
