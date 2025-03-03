import { db } from '@repo/db';
export declare class BookmarkService {
    list(params: {
        spaceIds: string[];
    }): Promise<{
        description: string | null;
        spaceId: string;
        id: string;
        createdAt: Date;
        name: string;
        url: string;
        tags: string[];
        author: string;
        deletedAt: Date | null;
        updatedAt: Date;
    }[]>;
    get(bookmarkId: string): Promise<{
        description: string | null;
        spaceId: string;
        id: string;
        createdAt: Date;
        name: string;
        url: string;
        tags: string[];
        author: string;
        deletedAt: Date | null;
        updatedAt: Date;
    } | null>;
    delete(bookmark: Exclude<Awaited<ReturnType<typeof db.bookmark.findUnique>>, null>): Promise<void>;
    create(params: {
        name: string;
        author: string;
        spaceId: string;
        url: string;
        description?: string;
        tags: string[];
    }): Promise<{
        description: string | null;
        spaceId: string;
        id: string;
        createdAt: Date;
        name: string;
        url: string;
        tags: string[];
        author: string;
        deletedAt: Date | null;
        updatedAt: Date;
    }>;
    update(params: {
        id: string;
        name?: string;
        url?: string;
        description?: string;
        tags?: string[];
    }): Promise<{
        description: string | null;
        spaceId: string;
        id: string;
        createdAt: Date;
        name: string;
        url: string;
        tags: string[];
        author: string;
        deletedAt: Date | null;
        updatedAt: Date;
    }>;
    findByUrlSpaceId(url: string, spaceId: string): Promise<{
        description: string | null;
        spaceId: string;
        id: string;
        createdAt: Date;
        name: string;
        url: string;
        tags: string[];
        author: string;
        deletedAt: Date | null;
        updatedAt: Date;
    } | null>;
}
