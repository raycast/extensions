import { z } from "zod";
export declare const activityRouter: import("@trpc/server/unstable-core-do-not-import").BuiltRouter<{
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
            type: "APP_OPEN" | "LOGIN" | "LOGOUT" | "BOOKMARK_OPEN" | "BOOKMARK_COPY" | "BOOKMARK_CREATED" | "BOOKMARK_UPDATED" | "BOOKMARK_DELETED" | "BOOKMARK_IMPORTED_FROM_BROWSER" | "SUBSCRIBE_TAG" | "UNSUBSCRIBE_TAG" | "TAG_CREATED" | "TAG_UPDATED" | "TAG_DELETED" | "SPACE_CREATED" | "SPACE_UPDATED" | "SPACE_DELETED" | "SPACE_MEMBER_INVITED" | "SPACE_MEMBER_JOINED" | "SPACE_MEMBER_LEFT" | "SPACE_MEMBER_REMOVED" | "SPACE_MEMBER_ROLE_CHANGED" | "SPACE_PLAN_CHANGED";
            spaceId: string;
            data: Record<string, string>;
        };
        output: void;
    }>;
}>;
