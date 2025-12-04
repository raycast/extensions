import { AnnouncementCategory } from "./announcement-categories";
import { Author, BaseSuccessResponse } from "./common";
import { Idea } from "./ideas";

export type Announcement = {
  idx: string;
  name: string;
  slug: string;
  excerpt: string;
  content: string;
  content_html: string;
  reaction_count: {
    [key: string]: number;
  };
  is_published: boolean;
  published_at: string;
  created_at: string;
  updated_at: string;
  author: Author;
  categories: AnnouncementCategory[];
  ideas: Idea[];
};

export type CreateOrUpdateAnnouncementFormValues = {
  name: string;
  author_idx: string;
  content?: string;
  published_at?: Date | null;
  idea_idxs?: string[];
  category_idxs?: string[];
};
export type UpdateAnnouncementRequest = CreateAnnouncementRequest;
export type CreateAnnouncementRequest = {
  name: string;
  author_idx: string;
  content: string;
  published_at?: string;
  idea_idxs?: string[];
  category_idxs?: string[];
};

export type GetAnnouncementsResponse = BaseSuccessResponse & { data: Announcement[] };
export type CreateAnnouncementResponse = { data: Announcement; meta: [] };
export type UpdateAnnouncementResponse = CreateAnnouncementResponse;
