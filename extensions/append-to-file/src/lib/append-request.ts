import { toSnippet } from "./clipboard";
import { type InsertPosition } from "./formatting";

export interface AppendRequest {
  text: string;
  snippet: string;
  insertPosition?: InsertPosition;
}

export function buildAppendRequest(
  text: string,
  insertPosition?: InsertPosition,
): AppendRequest {
  return {
    text,
    snippet: toSnippet(text),
    insertPosition,
  };
}
