import { z } from "zod";
export declare const spaceAuthRouter: import("@trpc/server/unstable-core-do-not-import").BuiltRouter<{
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
    listAuthenticatedSpaceIds: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: string[];
    }>;
    listAuthRequiredSpaceIds: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: string[];
    }>;
    sendAuthCode: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            spaceId: string;
            authEmail: string;
        };
        output: void;
    }>;
    verifyAuthCode: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            code: string;
            spaceId: string;
            authEmail: string;
        };
        output: void;
    }>;
    listMemberAuthPolicies: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            spaceId: string;
        };
        output: string[];
    }>;
    createMemberAuthPolicy: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            spaceId: string;
            emailPattern: string;
            authCheckInterval: string;
        };
        output: void;
    }>;
    deleteMemberAuthPolicy: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            spaceId: string;
            emailPattern: string;
        };
        output: void;
    }>;
    updateMemberAuthPolicy: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            spaceId: string;
            emailPattern: string;
            authCheckInterval: string;
        };
        output: void;
    }>;
    checkMySessionToPassAuthPolicy: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            spaceId: string;
            policyToAdd?: {
                emailPattern: string;
                authCheckInterval: string;
            } | undefined;
            policyToRemove?: {
                emailPattern: string;
            } | undefined;
        };
        output: boolean;
    }>;
}>;
