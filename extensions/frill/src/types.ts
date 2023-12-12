type Author = {
    name: string;
    email: string;
    avatar: string;
    created_at: string;
    updated_at: string;
    idx: string;
}

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

type AnnouncementCategory = {
    name: string;
    color: string;
    created_at: string;
    updated_at: string;
    idx: string;
}
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

type IdeaTopic = {
    name: string;
    order: number;
    idx: string;
}
export type Idea = {
    slug: string;
    name: string;
    description: string;
    cover_image: string;
    vote_count: number;
    comment_count: number;
    note_count: number;
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
    // created_by: string || null???;
    status: {
        name: string;
        color: string;
        is_completed: boolean;
        idx: string;
    }
    topics: IdeaTopic[];
}

type BaseSuccessResponse = {
    // data: any;
    meta: any;
    pagination?: {
        total: number;
        count: number;
        hasNextPage: boolean;
        startCursor: string;
        endCursor: string;
    };
}
export type GetAnnouncementsResponse = BaseSuccessResponse & { data: Announcement[] };
export type CreateAnnouncementResponse = Announcement;
export type UpdateAnnouncementResponse = CreateAnnouncementResponse;
export type GetIdeasResponse = BaseSuccessResponse & { data: Idea[] };
// export type SuccessResponse = {
//     data: Announcement[] | Idea[];
//     meta: any;
//     pagination?: {
//         total: number;
//         count: number;
//         hasNextPage: boolean;
//         startCursor: string;
//         endCursor: string;
//     };
// }

export type BodyRequest = CreateAnnouncementRequest;
export type RequestMethod = "GET" | "POST" | "DELETE";

export type SimpleSuccessResponse = {
    success: true;
    message: string;
}

export type ErrorResponse = {
    error: true;
    message: string;
}