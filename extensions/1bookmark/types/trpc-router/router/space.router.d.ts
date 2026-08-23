import { z } from "zod";
export declare const spaceRouter: import("@trpc/server").TRPCBuiltRouter<{
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
    create: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            name: string;
            image: string;
            description?: string | undefined;
            slackTeamId?: string | undefined;
        };
        output: void;
        meta: object;
    }>;
    leave: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            spaceId: string;
        };
        output: void;
        meta: object;
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
                memberAuthPolicies: number;
            };
            users: {
                status: import(".prisma/client").$Enums.TeamMemberStatus;
                spaceId: string;
                createdAt: Date;
                email: string;
                tags: string[];
                updatedAt: Date;
                image: string | null;
                nickname: string | null;
                authEmail: string | null;
                role: import(".prisma/client").$Enums.TeamRole;
            }[];
            memberAuthPolicies: {
                spaceId: string;
                createdAt: Date;
                updatedAt: Date;
                emailPattern: string;
                authCheckIntervalSec: number;
            }[];
        } & {
            type: import(".prisma/client").$Enums.SpaceType;
            status: string | null;
            description: string | null;
            id: string;
            createdAt: Date;
            name: string;
            updatedAt: Date;
            image: string | null;
            slackTeamId: string | null;
        }) | null;
        meta: object;
    }>;
    update: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            spaceId: string;
            description?: string | undefined;
            name?: string | undefined;
            image?: string | undefined;
            slackTeamId?: string | undefined;
            myNickname?: string | undefined;
            myImage?: string | undefined;
        };
        output: void;
        meta: object;
    }>;
    removeUser: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            spaceId: string;
            targetEmail: string;
        };
        output: void;
        meta: object;
    }>;
    updateMemberRole: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            spaceId: string;
            role: "ADMIN" | "MEMBER" | "READ";
            targetEmail: string;
        };
        output: void;
        meta: object;
    }>;
    topUsedBookmarks: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            spaceId: string;
            limit?: number | undefined;
            range?: "7d" | "30d" | "1y" | undefined;
        };
        output: {
            useCount: number;
            bookmark: {
                id: string;
                name: string;
                url: string;
                faviconUrl: string | null;
            };
        }[];
        meta: object;
    }>;
}>>;
