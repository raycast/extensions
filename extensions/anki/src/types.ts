import { Form, Keyboard } from '@raycast/api';

export interface AnkiCollectionData {
  crt: number;
}

// Base type for AnkiResponse with generic result and error types
export type AnkiResponse<T, E> = {
  result: T;
  error: E;
};

export type DeckName = {
  [deckName: string]: number;
};
export type DeckStats = {
  deck_id: number;
  name: string;
  new_count: number;
  learn_count: number;
  review_count: number;
  total_in_deck: number;
};

export interface CardField {
  fieldName: string;
  value: string;
}
export type CardFieldObj = {
  [fieldName: string]: { value: string; order: number };
};

export enum Ease {
  Again = 1,
  Hard = 2,
  Good = 3,
  Easy = 4,
}

export type Card = {
  answer: string;
  cardId: number;
  css: string;
  deckName: string;
  due: number;
  fieldOrder: number;
  fields: CardFieldObj;
  interval: number;
  lapses: number;
  left: number;
  mod: number;
  modelName: string;
  note: number;
  ord: number;
  question: string;
  queue: number;
  reps: number;
  type: number;
};

export type Note = {
  noteId: number;
  modelName: string;
  tags: string[];
  fields: {
    [fieldName: string]: {
      value: string;
      order: number;
    };
  };
  cards: number[];
};

export type Model = {
  css: string;
  did: null | number;
  flds: Field[];
  id: number;
  latexPost: string;
  latexPre: string;
  latexsvg: boolean;
  mod: number;
  name: string;
  originalStockKind: number;
  req: [number, string, number[]][];
  sortf: number;
  tmpls: Template[];
  type: number;
  usn: number;
};

type Template = {
  afmt: string;
  bafmt: string;
  bfont: string;
  bqfmt: string;
  bsize: number;
  did: null | number;
  id: number;
  name: string;
  ord: number;
  qfmt: string;
};

export type Field = {
  collapsed: boolean;
  description: string;
  excludeFromSearch: boolean;
  font: string;
  id: number;
  name: string;
  ord: number;
  plainText: boolean;
  preventDeletion: boolean;
  rtl: boolean;
  size: number;
  sticky: boolean;
  tag: null | string;
};

export type AddNoteParams = {
  deckName: string;
  modelName: string;
  fields: {
    [key: string]: string;
  };
  tags: string[];
  audio: AudioItem[];
  video: VideoItem[];
  picture: PictureItem[];
};

export type UpdateNoteParams = AddNoteParams;

type MediaSource =
  | { url: string; path?: never; data?: never }
  | { url?: never; path: string; data?: never }
  | { url?: never; path?: never; data: string };

type MediaItem = MediaSource & {
  filename: string;
  skipHash?: string;
  fields: string[];
};

type AudioItem = MediaItem;
type VideoItem = MediaItem;
type PictureItem = MediaItem;

export type FieldName = string;

export type CreateCardFormValues = {
  [K in `field_${FieldName}` | `file_${FieldName}`]?: K extends `field_${string}`
    ? string
    : string[];
} & {
  tags: string[];
  modelName: string;
  deckName: string;
};

export interface MediaFile {
  type: 'image' | 'audio' | 'video';
  filename: string;
}

export type FieldMediaMap = {
  [fieldName: string]: MediaFile[];
};

export type ShortcutDictionary = {
  [shortcut: string]: Keyboard.Shortcut;
};

export type FieldRef = React.RefObject<Form.TextArea | Form.FilePicker>;
