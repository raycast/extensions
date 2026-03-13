import { SnippetMarkdownFormatType } from "../constants/db-name";

export type Snippet = {
  uuid: string;
  createAt: Date;
  updateAt: Date;

  title: string;
  fileName: string;
  content: string;
  formatType: SnippetMarkdownFormatType;
  library: Library;
  labels: Label[];
};

export type Label = {
  uuid: string;

  colorHex: string; // #ffffff
  title: string;
};

export type Library = {
  uuid: string;
  name: string;
};

export type SnippetReq = {
  uuid?: string;
  title: string;
  fileName: string;
  content: string;
  formatType: SnippetMarkdownFormatType;
  libraryUUID: string;
  labelsUUID: string[];
};

export type LibraryReq = {
  uuid?: string;
  name: string;
};

export type LabelReq = {
  uuid?: string;
  colorHex?: string;
  title: string;
};
