import { z } from 'zod';
export declare const tagRouter: import("@trpc/server/unstable-core-do-not-import").BuiltRouter<{
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
    get: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            spaceId: string;
            tagName: string;
        };
        output: {
            description: string | null;
            spaceId: string;
            createdAt: Date;
            name: string;
            updatedAt: Date;
            icon: string | null;
        };
    }>;
    list: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            spaceIds: string[];
        };
        output: ({
            space: {
                name: string;
                image: string | null;
            };
        } & {
            description: string | null;
            spaceId: string;
            createdAt: Date;
            name: string;
            updatedAt: Date;
            icon: string | null;
        })[];
    }>;
    create: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            spaceId: string;
            name: string;
        };
        output: {
            description: string | null;
            spaceId: string;
            createdAt: Date;
            name: string;
            updatedAt: Date;
            icon: string | null;
        };
    }>;
    delete: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            spaceId: string;
            tagName: string;
        };
        output: void;
    }>;
}>;
