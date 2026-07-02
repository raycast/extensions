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
            tags: string[];
            name: string;
            url: string;
            description: string | null;
            createdAt: Date;
            updatedAt: Date;
        }[];
        meta: object;
    }>;
    listRecent: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
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
        }[];
        meta: object;
    }>;
    delete: import("@trpc/server").TRPCMutationProcedure<{
        input: string;
        output: void;
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
            author: string;
            authorEmail: string;
            deletedAt: Date | null;
            updatedAt: Date;
        };
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
