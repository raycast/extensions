// export type AnnouncementContentObject = {
//     type: "announcement-title";
//     children: { text: string }[];
//     categories: string[];
// } | {
//     type: string;
//     children: { text: string }[];
// } | {
//     alt: string;
//     url: string;
//     type: "image";
//     width: number;
//     height: number;
//     children: { text: string }[];

import { AnnouncementCategory } from "./announcement-categories";
import { Author, BaseSuccessResponse } from "./common";
import { Idea } from "./ideas";

// }
export type ImageAnnouncementContentObject = {
    alt: string;
    url: string;
    type: "image";
    width: number;
    height: number;
    children: { text: string }[];
}
export type AnnouncementContentObject = {
    type: "announcement-title";
    children: { text: string }[];
    categories: string[];
} | {
    type: "paragraph";
    children: { text: string }[];
} | ImageAnnouncementContentObject;
// type DefaultAnnouncementContentObject = {
//     type: string;
//     children: { text: string }[];
// };
// type TitleAnnouncementContentObject = Omit<DefaultAnnouncementContentObject, "type"> & {
//     type: "announcement-title";
//     categories: string[];
// }
// type ImageAnnouncementContentObject = Omit<DefaultAnnouncementContentObject, "type"> & {
//     alt: string;
//     url: string;
//     type: "image";
//     width: number;
//     height: number;
// }
// export type AnnouncementContentObject = TitleAnnouncementContentObject | DefaultAnnouncementContentObject | ImageAnnouncementContentObject;

export type Announcement = {
    idx: string;
    name: string;
    slug: string;
    excerpt: string;
    content: AnnouncementContentObject[];
    reaction_count: {
        [key: string]: number
    }
    is_published: boolean;
    published_at: string;
    created_at: string;
    updated_at: string;
    author: Author;
    categories: AnnouncementCategory[];
    ideas: Idea[];
}

export type UpdateAnnouncementFormValues = CreateNewAnnouncementFormValues;
export type CreateNewAnnouncementFormValues = {
    name: string;
    author_idx: string;
    content: string;
    published_at?: Date | null;
    idea_idxs?: string[];
    category_idxs?: string[];
}
export type UpdateAnnouncementRequest = CreateAnnouncementRequest;
export type CreateAnnouncementRequest = {
    name: string;
    author_idx: string;
    content: string;
    published_at?: string;
    idea_idxs?: string[];
    category_idxs?: string[];
}

export type GetAnnouncementsResponse = BaseSuccessResponse & { data: Announcement[] };
export type CreateAnnouncementResponse = Announcement;
export type UpdateAnnouncementResponse = CreateAnnouncementResponse;