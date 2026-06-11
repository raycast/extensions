import { z } from "zod";
export declare const spaceAuthRouter: import("@trpc/server").TRPCBuiltRouter<{
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
    listAuthenticatedSpaceIds: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: string[];
        meta: object;
    }>;
    listAuthRequiredSpaceIds: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: string[];
        meta: object;
    }>;
    sendAuthCode: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            spaceId: string;
            authEmail: string;
        };
        output: void;
        meta: object;
    }>;
    verifyAuthCode: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            code: string;
            spaceId: string;
            authEmail: string;
        };
        output: void;
        meta: object;
    }>;
    listMemberAuthPolicies: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            spaceId: string;
        };
        output: string[];
        meta: object;
    }>;
    createMemberAuthPolicy: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            spaceId: string;
            emailPattern: string;
            authCheckInterval: string;
        };
        output: void;
        meta: object;
    }>;
    deleteMemberAuthPolicy: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            spaceId: string;
            emailPattern: string;
        };
        output: void;
        meta: object;
    }>;
    updateMemberAuthPolicy: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            spaceId: string;
            emailPattern: string;
            authCheckInterval: string;
        };
        output: void;
        meta: object;
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
        meta: object;
    }>;
}>>;
