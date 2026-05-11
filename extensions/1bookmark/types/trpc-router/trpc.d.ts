import superjson from "superjson";
type CreateContextOptions = {
    headers: Headers;
    user?: {
        email: string;
        name: string;
        image: string | null;
        deviceName: string;
    };
    jti: string;
};
/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the session, etc.
 *
 * This helper generates the "internals" for a tRPC context. The API handler and RSC clients each
 * wrap this and provides the required context.
 *
 * @see https://trpc.io/docs/server/context
 */
export declare const createTRPCContext: (opts: CreateContextOptions) => Promise<{
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
}>;
/**
 * 2. INITIALIZATION
 *
 * This is where the tRPC API is initialized, connecting the context and transformer. We also parse
 * ZodErrors so that you get typesafety on the frontend if your procedure fails due to validation
 * errors on the backend.
 */
export declare const t: import("@trpc/server").TRPCRootObject<{
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
}, object, {
    transformer: typeof superjson;
    errorFormatter({ shape, error }: {
        error: import("@trpc/server").TRPCError;
        type: import("@trpc/server").ProcedureType | "unknown";
        path: string | undefined;
        input: unknown;
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
        } | undefined;
        shape: import("@trpc/server").TRPCDefaultErrorShape;
    }): {
        data: {
            zodError: import("zod").typeToFlattenedError<any, string> | null;
            code: import("@trpc/server").TRPC_ERROR_CODE_KEY;
            httpStatus: number;
            path?: string;
            stack?: string;
        };
        message: string;
        code: import("@trpc/server").TRPC_ERROR_CODE_NUMBER;
    };
}, {
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
            zodError: import("zod").typeToFlattenedError<any, string> | null;
            code: import("@trpc/server").TRPC_ERROR_CODE_KEY;
            httpStatus: number;
            path?: string;
            stack?: string;
        };
        message: string;
        code: import("@trpc/server").TRPC_ERROR_CODE_NUMBER;
    };
    transformer: true;
}>;
/**
 * Create a server-side caller.
 *
 * @see https://trpc.io/docs/server/server-side-calls
 */
export declare const createCallerFactory: import("@trpc/server").TRPCRouterCallerFactory<{
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
            zodError: import("zod").typeToFlattenedError<any, string> | null;
            code: import("@trpc/server").TRPC_ERROR_CODE_KEY;
            httpStatus: number;
            path?: string;
            stack?: string;
        };
        message: string;
        code: import("@trpc/server").TRPC_ERROR_CODE_NUMBER;
    };
    transformer: true;
}>;
/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these a lot in the
 * "/src/server/api/routers" directory.
 */
/**
 * This is how you create new routers and sub-routers in your tRPC API.
 *
 * @see https://trpc.io/docs/router
 */
export declare const createTRPCRouter: import("@trpc/server").TRPCRouterBuilder<{
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
            zodError: import("zod").typeToFlattenedError<any, string> | null;
            code: import("@trpc/server").TRPC_ERROR_CODE_KEY;
            httpStatus: number;
            path?: string;
            stack?: string;
        };
        message: string;
        code: import("@trpc/server").TRPC_ERROR_CODE_NUMBER;
    };
    transformer: true;
}>;
/**
 * Public (unauthenticated) procedure
 *
 * This is the base piece you use to build new queries and mutations on your tRPC API. It does not
 * guarantee that a user querying is authorized, but you can still access user session data if they
 * are logged in.
 */
export declare const publicProcedure: import("@trpc/server").TRPCProcedureBuilder<{
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
}, object, {}, import("@trpc/server").TRPCUnsetMarker, import("@trpc/server").TRPCUnsetMarker, import("@trpc/server").TRPCUnsetMarker, import("@trpc/server").TRPCUnsetMarker, false>;
export {};
