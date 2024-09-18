import { Color } from "@raycast/api";

export interface ErrnoException extends Error {
  errno?: number | undefined;
  code?: string | undefined;
  path?: string | undefined;
  syscall?: string | undefined;
}

export type ArbitraryObject = { [key: string]: unknown };

type Opaque<T, K extends string> = T & { __typename: K };

export type Base64 = Opaque<string, "base64">;

export type Paper = {
  name: string;
  createdAt: number;
  content: Base64;
  description?: string;
};

export type PaperRawData = Record<
  string,
  {
    color: Color.ColorLike;
    papers: Array<Paper>;
  }
>;

export type Mode =
  | "list"
  | "read"
  | "edit"
  | "create-category"
  | "create-paper"
  | "update-category"
  | "delete-category";

export type PaperToRead = {
  content: string;
  name: string;
};

export type CategoryToUpdate = {
  category: string;
  newCategoryName: string;
  color: string;
};

export type PaperDataSwitchMode = {
  paper: Paper;
  index: number;
  category: string;
};

export type SwitchMode = (newMode: Mode, paperDatas?: PaperDataSwitchMode) => void;
