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
        spaceImage: string | null;
        spaceType: import(".prisma/client").$Enums.SpaceType;
        tags: string[];
        name: string;
        url: string;
        description: string | null;
        faviconUrl: string | null;
        faviconAttemptedAt: Date | null;
        faviconAttemptCount: number;
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
        faviconUrl: string | null;
        faviconAttemptedAt: Date | null;
        faviconAttemptCount: number;
        previewImageUrl: string | null;
        previewImageAttemptedAt: Date | null;
        previewImageAttemptCount: number;
        author: string;
        authorEmail: string;
        deletedAt: Date | null;
        updatedAt: Date;
    } | null>;
    getDetail(params: {
        bookmarkId: string;
    }): Promise<{
        id: string;
        spaceId: string;
        name: string;
        url: string;
        description: string | null;
        tags: string[];
        faviconUrl: string | null;
        authorEmail: string;
        createdAt: Date;
        updatedAt: Date;
        author: {
            email: string;
            name: string;
        };
        space: {
            type: import(".prisma/client").$Enums.SpaceType;
            id: string;
            name: string;
            image: string | null;
        };
        stats: {
            last7d: {
                uses: number;
            };
            last30d: {
                uses: number;
            };
            last1y: {
                uses: number;
            };
        };
        usageBuckets: {
            last7d: {
                bucketStart: Date;
                uses: number;
            }[];
            last30d: {
                bucketStart: Date;
                uses: number;
            }[];
            last1y: {
                bucketStart: Date;
                uses: number;
            }[];
        };
    } | null>;
    private queryUsageBuckets;
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
        faviconUrl: string | null;
        faviconAttemptedAt: Date | null;
        faviconAttemptCount: number;
        previewImageUrl: string | null;
        previewImageAttemptedAt: Date | null;
        previewImageAttemptCount: number;
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
        faviconUrl: string | null;
        faviconAttemptedAt: Date | null;
        faviconAttemptCount: number;
        previewImageUrl: string | null;
        previewImageAttemptedAt: Date | null;
        previewImageAttemptCount: number;
        author: string;
        authorEmail: string;
        deletedAt: Date | null;
        updatedAt: Date;
    }>;
    reportFaviconAttempts(params: {
        attempts: {
            id: string;
            faviconUrl: string | null;
        }[];
    }): Promise<void>;
    reportPreviewImageAttempts(params: {
        attempts: {
            id: string;
            previewImageUrl: string | null;
        }[];
    }): Promise<void>;
    findByUrlSpaceId(url: string, spaceId: string): Promise<{
        description: string | null;
        spaceId: string;
        id: string;
        createdAt: Date;
        name: string;
        url: string;
        tags: string[];
        faviconUrl: string | null;
        faviconAttemptedAt: Date | null;
        faviconAttemptCount: number;
        previewImageUrl: string | null;
        previewImageAttemptedAt: Date | null;
        previewImageAttemptCount: number;
        author: string;
        authorEmail: string;
        deletedAt: Date | null;
        updatedAt: Date;
    } | null>;
    usageRanked(params: {
        email: string;
        sinceDays?: number;
        limit?: number;
    }): Promise<{
        recent: {
            lastUsed: Date;
            useCount: number;
            bookmark: {
                id: string;
                authorEmail: string;
                authorName: string;
                spaceId: string;
                spaceName: string;
                spaceImage: string | null;
                spaceType: import(".prisma/client").$Enums.SpaceType;
                tags: string[];
                name: string;
                url: string;
                description: string | null;
                faviconUrl: string | null;
                faviconAttemptedAt: Date | null;
                faviconAttemptCount: number;
                createdAt: Date;
                updatedAt: Date;
            };
        }[];
        mostUsed: {
            lastUsed: Date;
            useCount: number;
            bookmark: {
                id: string;
                authorEmail: string;
                authorName: string;
                spaceId: string;
                spaceName: string;
                spaceImage: string | null;
                spaceType: import(".prisma/client").$Enums.SpaceType;
                tags: string[];
                name: string;
                url: string;
                description: string | null;
                faviconUrl: string | null;
                faviconAttemptedAt: Date | null;
                faviconAttemptCount: number;
                createdAt: Date;
                updatedAt: Date;
            };
        }[];
    }>;
    listRecent(params: {
        email: string;
        mode: 'lastUsed' | 'top7d' | 'top30d' | 'top90d' | 'top1y';
    }): Promise<{
        id: string;
        authorEmail: string;
        authorName: string;
        spaceId: string;
        spaceName: string;
        spaceImage: string | null;
        spaceType: import(".prisma/client").$Enums.SpaceType;
        tags: string[];
        name: string;
        url: string;
        description: string | null;
        faviconUrl: string | null;
        faviconAttemptedAt: Date | null;
        faviconAttemptCount: number;
        previewImageUrl: string | null;
        previewImageAttemptedAt: Date | null;
        previewImageAttemptCount: number;
        createdAt: Date;
        updatedAt: Date;
        lastUsed: Date;
        useCount: number;
    }[]>;
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
