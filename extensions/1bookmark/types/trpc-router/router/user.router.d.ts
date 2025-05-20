import { z } from 'zod';
export declare const userRouter: import("@trpc/server/unstable-core-do-not-import").BuiltRouter<{
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
    me: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            device?: string | undefined;
        } | undefined;
        output: {
            associatedSpaces: {
                myTags: string[];
                myRole: import(".prisma/client").$Enums.TeamRole;
                myImage: string | null;
                myNickname: string | null;
                myAuthEmail: string | null;
                tags: {
                    description: string | null;
                    spaceId: string;
                    createdAt: Date;
                    name: string;
                    updatedAt: Date;
                    icon: string | null;
                }[];
                _count: {
                    users: number;
                };
                type: import(".prisma/client").$Enums.SpaceType;
                status: string | null;
                description: string | null;
                id: string;
                createdAt: Date;
                name: string;
                updatedAt: Date;
                image: string | null;
            }[];
            createdAt: Date;
            name: string;
            email: string;
            updatedAt: Date;
            image: string | null;
        };
    }>;
    listBySpaceId: import("@trpc/server").TRPCQueryProcedure<{
        input: string;
        output: ({
            user: {
                createdAt: Date;
                name: string;
                email: string;
                updatedAt: Date;
                image: string | null;
            };
        } & {
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
        })[];
    }>;
    inviteMembers: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            spaceId: string;
            emails: string[];
        };
        output: void;
    }>;
    subscribeTag: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            spaceId: string;
            tagName: string;
        };
        output: void;
    }>;
    unsubscribeTag: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            spaceId: string;
            tagName: string;
        };
        output: void;
    }>;
    updateName: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            name: string;
        };
        output: void;
    }>;
}>;
