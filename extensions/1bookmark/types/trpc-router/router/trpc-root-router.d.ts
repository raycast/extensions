export declare const appRouter: import("@trpc/server/unstable-core-do-not-import").BuiltRouter<{
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
            zodError: import("zod").typeToFlattenedError<any, string> | null;
            code: import("@trpc/server/unstable-core-do-not-import").TRPC_ERROR_CODE_KEY;
            httpStatus: number;
            path?: string;
            stack?: string;
        };
        message: string;
        code: import("@trpc/server/unstable-core-do-not-import").TRPC_ERROR_CODE_NUMBER;
    };
    transformer: true;
}, import("@trpc/server/unstable-core-do-not-import").DecorateCreateRouterOptions<{
    hello: import("@trpc/server/unstable-core-do-not-import").BuiltRouter<{
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
                zodError: import("zod").typeToFlattenedError<any, string> | null;
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
                name: string;
            };
            output: {
                success: boolean;
                message: string;
            };
        }>;
    }>;
    user: import("@trpc/server/unstable-core-do-not-import").BuiltRouter<{
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
                zodError: import("zod").typeToFlattenedError<any, string> | null;
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
            input: void;
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
    bookmark: import("@trpc/server/unstable-core-do-not-import").BuiltRouter<{
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
                zodError: import("zod").typeToFlattenedError<any, string> | null;
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
        hello: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                text: string;
            };
            output: {
                greeting: string;
            };
        }>;
        create: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                description: string;
                spaceId: string;
                name: string;
                url: string;
                tags: string[];
            };
            output: {
                description: string | null;
                spaceId: string;
                id: string;
                createdAt: Date;
                name: string;
                url: string;
                tags: string[];
                author: string;
                deletedAt: Date | null;
                updatedAt: Date;
            };
        }>;
        listAll: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                spaceIds: string[];
            };
            output: {
                description: string | null;
                spaceId: string;
                id: string;
                createdAt: Date;
                name: string;
                url: string;
                tags: string[];
                author: string;
                deletedAt: Date | null;
                updatedAt: Date;
            }[];
        }>;
        listRecent: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: {
                description: string | null;
                spaceId: string;
                id: string;
                createdAt: Date;
                name: string;
                url: string;
                tags: string[];
                author: string;
                deletedAt: Date | null;
                updatedAt: Date;
            }[];
        }>;
        delete: import("@trpc/server").TRPCMutationProcedure<{
            input: string;
            output: void;
        }>;
        exists: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                spaceId: string;
                url: string;
            };
            output: boolean;
        }>;
        update: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                id: string;
                description?: string | undefined;
                name?: string | undefined;
                url?: string | undefined;
                tags?: string[] | undefined;
            };
            output: {
                description: string | null;
                spaceId: string;
                id: string;
                createdAt: Date;
                name: string;
                url: string;
                tags: string[];
                author: string;
                deletedAt: Date | null;
                updatedAt: Date;
            };
        }>;
    }>;
    space: import("@trpc/server/unstable-core-do-not-import").BuiltRouter<{
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
                zodError: import("zod").typeToFlattenedError<any, string> | null;
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
    tag: import("@trpc/server/unstable-core-do-not-import").BuiltRouter<{
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
                zodError: import("zod").typeToFlattenedError<any, string> | null;
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
    activity: import("@trpc/server/unstable-core-do-not-import").BuiltRouter<{
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
                zodError: import("zod").typeToFlattenedError<any, string> | null;
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
                type: "APP_OPEN" | "LOGIN" | "LOGOUT" | "BOOKMARK_OPEN" | "BOOKMARK_COPY" | "BOOKMARK_CREATED" | "BOOKMARK_UPDATED" | "BOOKMARK_DELETED" | "SUBSCRIBE_TAG" | "UNSUBSCRIBE_TAG" | "TAG_CREATED" | "TAG_UPDATED" | "TAG_DELETED" | "SPACE_CREATED" | "SPACE_UPDATED" | "SPACE_DELETED" | "SPACE_MEMBER_INVITED" | "SPACE_MEMBER_JOINED" | "SPACE_MEMBER_LEFT" | "SPACE_MEMBER_REMOVED" | "SPACE_MEMBER_ROLE_CHANGED" | "SPACE_PLAN_CHANGED";
                spaceId: string;
                data: Record<string, string>;
            };
            output: void;
        }>;
    }>;
    login: import("@trpc/server/unstable-core-do-not-import").BuiltRouter<{
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
                zodError: import("zod").typeToFlattenedError<any, string> | null;
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
        generateMagicLink: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                email: string;
            };
            output: void;
        }>;
    }>;
}>>;
export type AppRouter = typeof appRouter;
