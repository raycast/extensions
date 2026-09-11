import { z } from "zod";
export declare const favoriteRouter: import("@trpc/server").TRPCBuiltRouter<{
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
    list: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
            bookmarkId: string;
            sortOrder: number;
            favoritedAt: Date;
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
        meta: object;
    }>;
    listIds: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: string[];
        meta: object;
    }>;
    add: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            bookmarkId: string;
        };
        output: void;
        meta: object;
    }>;
    remove: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            bookmarkId: string;
        };
        output: void;
        meta: object;
    }>;
}>>;
