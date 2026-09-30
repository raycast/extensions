import { Author, BaseSuccessResponse } from "./common";
import { Topic } from "./topics";

export type Idea = {
  slug: string;
  name: string;
  description: string;
  cover_image: string;
  vote_count: number;
  comment_count: number;
  note_count?: number;
  is_private: boolean;
  is_bug: boolean;
  show_in_roadmap: boolean;
  is_archived: boolean;
  is_shortlisted: boolean;
  is_completed: boolean;
  approval_status: string;
  created_at: string;
  updated_at: string;
  excerpt: string;
  is_pinned: boolean;
  idx: string;
  author: Author;
  created_by: string;
  status: {
    name: string;
    color: string;
    is_completed: boolean;
    idx: string;
  };
  topics: Topic[];
};
export type CreateIdeaRequest = {
  name: string;
  author_idx: string;
  description: string;
  is_private?: boolean;
  topic_idxs?: string[];
};
export type UpdateIdeaRequest = CreateIdeaRequest;

export type GetIdeasResponse = BaseSuccessResponse & { data: Idea[] };
export type CreateIdeaResponse = { data: Idea; meta: [] };
export type DeleteIdeaResponse = { success: true };
export type UpdateIdeaResponse = CreateIdeaResponse;
