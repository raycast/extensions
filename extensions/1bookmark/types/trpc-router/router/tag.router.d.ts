import { z } from 'zod';
export declare const tagRouter: import("@trpc/server").TRPCBuiltRouter<{
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
        meta: object;
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
        meta: object;
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
        meta: object;
    }>;
    delete: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            spaceId: string;
            tagName: string;
        };
        output: void;
        meta: object;
    }>;
}>>;
