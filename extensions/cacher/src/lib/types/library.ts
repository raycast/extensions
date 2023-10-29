import { Label } from "./label";
import { Snippet } from "./snippet";

export interface Library {
  id: number;
  guid: string;
  createdAt: string;
  updatedAt: string;
  snippets: Snippet[];
  snippetsCount: number;
  draftSnippets: Snippet[];
  labels: Label[];
}
