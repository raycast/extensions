import { z } from "zod";
export declare const spaceRouter: import("@trpc/server/unstable-core-do-not-import").BuiltRouter<{
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
        accessToken: string;
        refreshToken: string;
        iat: number;
        exp: number;
    };
    meta: object;
    errorShape: {
        data: {
            zodError: z.typeToFlattenedError<any, string> | null;
            code: import("@trpc/server/unstable-core-do-not-import").TRPC_ERROR_CODE_KEY;
            httpStatus: number;
            path?: string;
            stack?: string;
        };
        message: string;
        code: import("@trpc/server/unstable-core-do-not-import").TRPC_ERROR_CODE_NUMBER;
    };
    transformer: true;
}, {
    create: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            name: string;
            image: string;
            description?: string | undefined;
        };
        output: void;
    }>;
    leave: import("@trpc/server").TRPCQueryProcedure<{
        input: string;
        output: void;
    }>;
    get: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            spaceId: string;
        };
        output: ({
            _count: {
                tags: number;
                bookmarks: number;
                users: number;
            };
        } & {
            type: import(".prisma/client").$Enums.SpaceType;
            status: string | null;
            description: string | null;
            id: string;
            createdAt: Date;
            name: string;
            updatedAt: Date;
            image: string | null;
        }) | null;
    }>;
    update: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            spaceId: string;
            description?: string | undefined;
            name?: string | undefined;
            image?: string | undefined;
        };
        output: void;
    }>;
    removeUser: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            spaceId: string;
            targetEmail: string;
        };
        output: void;
    }>;
}>;
