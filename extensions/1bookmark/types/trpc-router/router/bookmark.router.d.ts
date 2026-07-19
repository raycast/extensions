import { z } from "zod";
export declare const bookmarkRouter: import("@trpc/server").TRPCBuiltRouter<{
    ctx: {
        db: import(".prisma/client").PrismaClient<{
            log: "error"[];
        }, never, import("@prisma/client/runtime/library").DefaultArgs>;
        user: {
            email: string;
            name: string;
            image: string | null;
            deviceName: string;
        } | undefined;
        headers: Headers;
        jti: string;
    };
    meta: object;
    errorShape: {
        data: {
            zodError: z.typeToFlattenedError<any, string> | null;
            code: import("@trpc/server").TRPC_ERROR_CODE_KEY;
            httpStatus: number;
            path?: string;
            stack?: string;
        };
        message: string;
        code: import("@trpc/server").TRPC_ERROR_CODE_NUMBER;
    };
    transformer: true;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    hello: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            text: string;
        };
        output: {
            greeting: string;
        };
        meta: object;
    }>;
    fetchPageTitle: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            url: string;
        };
        output: string | null;
        meta: object;
    }>;
    fetchPageMeta: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            url: string;
        };
        output: import("../lib/fetch-page-title").PageMeta;
        meta: object;
    }>;
    create: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            description: string;
            spaceId: string;
            name: string;
            url: string;
            tags: string[];
        };
        output: {
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
        };
        meta: object;
    }>;
    listAll: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            spaceIds: string[];
        };
        output: {
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
        }[];
        meta: object;
    }>;
    listRecent: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            mode: "lastUsed" | "top7d" | "top30d" | "top90d" | "top1y";
        };
        output: {
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
        }[];
        meta: object;
    }>;
    delete: import("@trpc/server").TRPCMutationProcedure<{
        input: string;
        output: void;
        meta: object;
    }>;
    getDetail: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            bookmarkId: string;
        };
        output: {
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
        };
        meta: object;
    }>;
    usageRanked: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
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
        };
        meta: object;
    }>;
    exists: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            spaceId: string;
            url: string;
        };
        output: boolean;
        meta: object;
    }>;
    update: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            id: string;
            description?: string | undefined;
            name?: string | undefined;
            url?: string | undefined;
            tags?: string[] | undefined;
        };
        output: {
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
        };
        meta: object;
    }>;
    reportFaviconAttempts: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            attempts: {
                id: string;
                faviconUrl: string | null;
            }[];
        };
        output: void;
        meta: object;
    }>;
    reportPreviewImageAttempts: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            attempts: {
                id: string;
                previewImageUrl: string | null;
            }[];
        };
        output: void;
        meta: object;
    }>;
    import: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            spaceId: string;
            tags: string[];
            bookmarks: {
                name: string;
                url: string;
                description?: string | undefined;
            }[];
            browserName: string;
        };
        output: void;
        meta: object;
    }>;
}>>;
