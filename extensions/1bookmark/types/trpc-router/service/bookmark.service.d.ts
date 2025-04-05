import { db, Prisma } from '@repo/db';
export declare class BookmarkService {
    list(params: {
        spaceIds: string[];
    }): Promise<{
        id: string;
        authorEmail: string;
        authorName: string;
        spaceId: string;
        spaceName: string;
        tags: string[];
        name: string;
        url: string;
        description: string | null;
        createdAt: Date;
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
        authorEmail: string;
        deletedAt: Date | null;
        updatedAt: Date;
    } | null>;
    delete(bookmark: Exclude<Awaited<ReturnType<typeof db.bookmark.findUnique>>, null>): Promise<void>;
    create(params: {
        name: string;
        authorEmail: string;
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
        authorEmail: string;
        deletedAt: Date | null;
        updatedAt: Date;
    }>;
    update(params: {
        id: string;
        email: string;
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
        authorEmail: string;
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
        authorEmail: string;
        deletedAt: Date | null;
        updatedAt: Date;
    } | null>;
    import(params: {
        authorEmail: string;
        tags: string[];
        spaceId: string;
        browserName: string;
        bookmarks: {
            name: string;
            url: string;
            description?: string;
        }[];
    }): Promise<Prisma.BatchPayload>;
}
