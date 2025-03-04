export interface PageInfo {
    entity_type: string;
    url: string;

    name: string;
    description: string | null;
    thumbnail: string | null;
    domain: string;
    authors?: string[];

    // ids present if saved by someone before
    uuid?: string;
    slug?: string;

    number_of_people?: number;
    is_curator?: boolean;

    // present if saved by current user before
    notes?: UserNote[];
    connections?: Collection[];
    suggested_connections?: Collection[];
    recent_connections?: Collection[];
    is_favorite?: boolean;
    marked_as_private?: boolean;
}

export interface PageEntity {
    uuid: string;
    slug: string;
    entity_type: string;
    notes?: UserNote[];
}

export interface UserNote extends PageEntity {
    entity_type: "contribution.note";
    text: string;
    html: string;
}

export interface Collection extends PageEntity {
    entity_type: "collection.collection";
    name: string;
    description: string | null;
    number_of_connections?: number;
    privacy?: CollectionPrivacy;
    has_collaborators?: boolean;
    is_favorite?: boolean;
}
export type CollectionPrivacy = "public" | "private" | "semiopen";

export interface UserInfo {
    limit_to_add_cards: number;
    privacy__default_private: boolean;
}

export interface SublimeCard {
    uuid: string;
    slug: string;
    entity_type: string;

    name?: string;
    smart_title?: string[];
    description?: string;
    html?: string;
    text?: string;
    thumbnail?: string;
    last_updated_at: string;
    info?: {
        content: string;
        images: string[];
    };

    urls: string[];
    source?: {
        name: string;
        domain: string;
        url: string; // does not include https://
    };
    domain?: string;
    authors: string[];

    privacy?: string;
    curated_by?: {
        first?: {
            name: string;
            slug: string;
        };
        others: number;
    };
    viewer?: {
        following: boolean;
        favorite: boolean;
        staff_pick: boolean;
    };

    number_of_cards?: number;
    number_of_connections?: number;
    number_of_public_highlights?: number;
}
