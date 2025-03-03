import { RouterOutputs } from "@repo/trpc-router";

// Bookmark registration form
export interface RegisterBookmarkForm {
  title: string;
  url: string;
  description: string;
}

export type Bookmark = RouterOutputs["bookmark"]["listAll"][number];
export type Tag = RouterOutputs["tag"]["list"][number];
