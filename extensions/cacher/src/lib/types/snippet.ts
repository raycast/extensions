import { SnippetFile } from "./snippet-file";
import { AttributionUser } from "./user";

export interface Snippet {
  id: number;
  guid: string;
  title: string;
  description: string | null;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
  gistId: string | null;
  gistboxId: string | null;
  syncToGist: boolean | null;
  gistUpdatedAt: string | null;
  pagePermission: "private" | "anyone" | null;
  starredBy: AttributionUser[];
  createdBy: AttributionUser;
  lastUpdatedBy: AttributionUser;
  files: SnippetFile[];
}
