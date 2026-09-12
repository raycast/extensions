import { type Prisma } from "@repo/db";
export declare class FavoriteService {
    getOrCreateDefaultList(email: string, tx?: Prisma.TransactionClient): Promise<string>;
    listForUser(email: string): Promise<({
        bookmark: {
            user: {
                name: string;
                email: string;
            };
            space: {
                type: import(".prisma/client").$Enums.SpaceType;
                name: string;
                image: string | null;
            };
        } & {
            description: string | null;
            spaceId: string;
            id: string;
            createdAt: Date;
            name: string;
            updatedAt: Date;
            tags: string[];
            deletedAt: Date | null;
            url: string;
            faviconUrl: string | null;
            faviconAttemptedAt: Date | null;
            faviconAttemptCount: number;
            previewImageUrl: string | null;
            previewImageAttemptedAt: Date | null;
            previewImageAttemptCount: number;
            author: string;
            authorEmail: string;
        };
    } & {
        createdAt: Date;
        bookmarkId: string;
        sortOrder: number;
        listId: string;
    })[]>;
    add(email: string, bookmarkId: string): Promise<void>;
    remove(email: string, bookmarkId: string): Promise<void>;
    listIdsForUser(email: string): Promise<string[]>;
}
