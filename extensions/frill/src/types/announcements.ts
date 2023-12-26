import { AnnouncementCategory } from "./announcement-categories";
import { Author, BaseSuccessResponse } from "./common";
import { Idea } from "./ideas";
import { Descendant } from "slate";

// these are Custom Slate types
type CustomHeading = {
  type: "heading";
  level: number;
};
type CustomAnnouncementTitle = {
  type: "announcement-title";
};
type CustomIdea = {
  type: "idea";
  ideaIdx: string;
};
type CustomImage = {
  type: "image";
  align?: "left" | "right";
  url: string;
  alt: string;
};
type CustomLink = {
  type: "link";
  url: string;
};
type CustomListItem = { type: "list-item" };
type CustomCode = { type: "code" };
type CustomCodeBlock = { type: "code-block" };
type CustomElement = {
  children: Descendant[];
} & (
  | CustomHeading
  | CustomAnnouncementTitle
  | CustomIdea
  | CustomImage
  | CustomLink
  | CustomListItem
  | CustomCode
  | CustomCodeBlock
);
type CustomText = {
  text: string;
};
export type CustomNode = CustomElement | CustomText;

export type Announcement = {
  idx: string;
  name: string;
  slug: string;
  excerpt: string;
  content: CustomNode[];
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
