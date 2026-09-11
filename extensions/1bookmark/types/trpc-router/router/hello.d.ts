import { z } from 'zod';
export declare const schema: z.ZodObject<{
    name: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
}, {
    name: string;
}>;
export declare const helloRouter: import("@trpc/server").TRPCBuiltRouter<{
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
            name: string;
        };
        output: {
            success: boolean;
            message: string;
        };
        meta: object;
    }>;
}>>;
