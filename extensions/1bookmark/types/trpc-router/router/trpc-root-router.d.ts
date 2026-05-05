export declare const appRouter: import("@trpc/server").TRPCBuiltRouter<{
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
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    hello: import("@trpc/server").TRPCBuiltRouter<{
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
    user: import("@trpc/server").TRPCBuiltRouter<{
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
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
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
            meta: object;
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
            meta: object;
        }>;
        inviteMembers: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                spaceId: string;
                emails: string[];
            };
            output: void;
            meta: object;
        }>;
        subscribeTag: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                spaceId: string;
                tagName: string;
            };
            output: void;
            meta: object;
        }>;
        unsubscribeTag: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                spaceId: string;
                tagName: string;
            };
            output: void;
            meta: object;
        }>;
        updateName: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                name: string;
            };
            output: void;
            meta: object;
        }>;
    }>>;
    bookmark: import("@trpc/server").TRPCBuiltRouter<{
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
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        hello: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                text: string;
            };
            output: {
                greeting: string;
            };
            meta: object;
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
                authorEmail: string;
                deletedAt: Date | null;
                updatedAt: Date;
            };
            meta: object;
        }>;
        listAll: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                spaceIds: string[];
            };
            output: {
                id: string;
                authorEmail: string;
                authorName: string;
                spaceId: string;
                spaceName: string;
                tags: string[];
                name: string;
                url: string;
                description: string | null;
                createdAt: Date;
                updatedAt: Date;
            }[];
            meta: object;
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
                authorEmail: string;
                deletedAt: Date | null;
                updatedAt: Date;
            }[];
            meta: object;
        }>;
        delete: import("@trpc/server").TRPCMutationProcedure<{
            input: string;
            output: void;
            meta: object;
        }>;
        exists: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                spaceId: string;
                url: string;
            };
            output: boolean;
            meta: object;
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
                authorEmail: string;
                deletedAt: Date | null;
                updatedAt: Date;
            };
            meta: object;
        }>;
        import: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                spaceId: string;
                tags: string[];
                bookmarks: {
                    name: string;
                    url: string;
                    description?: string | undefined;
                }[];
                browserName: string;
            };
            output: void;
            meta: object;
        }>;
    }>>;
    space: import("@trpc/server").TRPCBuiltRouter<{
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
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        create: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                name: string;
                image: string;
                description?: string | undefined;
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
                _count: {
                    tags: number;
                    bookmarks: number;
                    users: number;
                    memberAuthPolicies: number;
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
            meta: object;
        }>;
        update: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                spaceId: string;
                description?: string | undefined;
                name?: string | undefined;
                image?: string | undefined;
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
    }>>;
    spaceAuth: import("@trpc/server").TRPCBuiltRouter<{
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
    tag: import("@trpc/server").TRPCBuiltRouter<{
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
    activity: import("@trpc/server").TRPCBuiltRouter<{
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
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        create: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                type: "BOOKMARK_OPEN" | "BOOKMARK_COPY";
                spaceId: string;
                data: Record<string, string>;
            };
            output: void;
            meta: object;
        }>;
    }>>;
    login: import("@trpc/server").TRPCBuiltRouter<{
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
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        generateMagicLink: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                email: string;
            };
            output: void;
            meta: object;
        }>;
    }>>;
}>>;
export type AppRouter = typeof appRouter;
