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
                    slackTeamId: string | null;
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
                role?: "ADMIN" | "MEMBER" | "READ" | undefined;
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
        listSessions: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: {
                sessions: {
                    jti: string;
                    createdAt: Date;
                    expires: Date;
                    deviceName: string | null;
                    lastActive: Date;
                }[];
                currentJti: string;
            };
            meta: object;
        }>;
        revokeSession: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                jti: string;
            };
            output: void;
            meta: object;
        }>;
        listBlockingOwnerships: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: {
                id: string;
                name: string;
            }[];
            meta: object;
        }>;
        deleteAccount: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                confirmEmail: string;
            };
            output: void;
            meta: object;
        }>;
        revokeOtherSessions: import("@trpc/server").TRPCMutationProcedure<{
            input: void;
            output: {
                count: number;
            };
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
        fetchPageTitle: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                url: string;
            };
            output: string | null;
            meta: object;
        }>;
        fetchPageMeta: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                url: string;
            };
            output: import("../lib/fetch-page-title").PageMeta;
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
                faviconUrl: string | null;
                faviconAttemptedAt: Date | null;
                faviconAttemptCount: number;
                previewImageUrl: string | null;
                previewImageAttemptedAt: Date | null;
                previewImageAttemptCount: number;
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
                spaceImage: string | null;
                spaceType: import(".prisma/client").$Enums.SpaceType;
                tags: string[];
                name: string;
                url: string;
                description: string | null;
                faviconUrl: string | null;
                faviconAttemptedAt: Date | null;
                faviconAttemptCount: number;
                createdAt: Date;
                updatedAt: Date;
            }[];
            meta: object;
        }>;
        listRecent: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                mode: "lastUsed" | "top7d" | "top30d" | "top90d" | "top1y";
            };
            output: {
                id: string;
                authorEmail: string;
                authorName: string;
                spaceId: string;
                spaceName: string;
                spaceImage: string | null;
                spaceType: import(".prisma/client").$Enums.SpaceType;
                tags: string[];
                name: string;
                url: string;
                description: string | null;
                faviconUrl: string | null;
                faviconAttemptedAt: Date | null;
                faviconAttemptCount: number;
                previewImageUrl: string | null;
                previewImageAttemptedAt: Date | null;
                previewImageAttemptCount: number;
                createdAt: Date;
                updatedAt: Date;
                lastUsed: Date;
                useCount: number;
            }[];
            meta: object;
        }>;
        delete: import("@trpc/server").TRPCMutationProcedure<{
            input: string;
            output: void;
            meta: object;
        }>;
        getDetail: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                bookmarkId: string;
            };
            output: {
                id: string;
                spaceId: string;
                name: string;
                url: string;
                description: string | null;
                tags: string[];
                faviconUrl: string | null;
                authorEmail: string;
                createdAt: Date;
                updatedAt: Date;
                author: {
                    email: string;
                    name: string;
                };
                space: {
                    type: import(".prisma/client").$Enums.SpaceType;
                    id: string;
                    name: string;
                    image: string | null;
                };
                stats: {
                    last7d: {
                        uses: number;
                    };
                    last30d: {
                        uses: number;
                    };
                    last1y: {
                        uses: number;
                    };
                };
                usageBuckets: {
                    last7d: {
                        bucketStart: Date;
                        uses: number;
                    }[];
                    last30d: {
                        bucketStart: Date;
                        uses: number;
                    }[];
                    last1y: {
                        bucketStart: Date;
                        uses: number;
                    }[];
                };
            };
            meta: object;
        }>;
        usageRanked: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: {
                recent: {
                    lastUsed: Date;
                    useCount: number;
                    bookmark: {
                        id: string;
                        authorEmail: string;
                        authorName: string;
                        spaceId: string;
                        spaceName: string;
                        spaceImage: string | null;
                        spaceType: import(".prisma/client").$Enums.SpaceType;
                        tags: string[];
                        name: string;
                        url: string;
                        description: string | null;
                        faviconUrl: string | null;
                        faviconAttemptedAt: Date | null;
                        faviconAttemptCount: number;
                        createdAt: Date;
                        updatedAt: Date;
                    };
                }[];
                mostUsed: {
                    lastUsed: Date;
                    useCount: number;
                    bookmark: {
                        id: string;
                        authorEmail: string;
                        authorName: string;
                        spaceId: string;
                        spaceName: string;
                        spaceImage: string | null;
                        spaceType: import(".prisma/client").$Enums.SpaceType;
                        tags: string[];
                        name: string;
                        url: string;
                        description: string | null;
                        faviconUrl: string | null;
                        faviconAttemptedAt: Date | null;
                        faviconAttemptCount: number;
                        createdAt: Date;
                        updatedAt: Date;
                    };
                }[];
            };
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
                faviconUrl: string | null;
                faviconAttemptedAt: Date | null;
                faviconAttemptCount: number;
                previewImageUrl: string | null;
                previewImageAttemptedAt: Date | null;
                previewImageAttemptCount: number;
                author: string;
                authorEmail: string;
                deletedAt: Date | null;
                updatedAt: Date;
            };
            meta: object;
        }>;
        reportFaviconAttempts: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                attempts: {
                    id: string;
                    faviconUrl: string | null;
                }[];
            };
            output: void;
            meta: object;
        }>;
        reportPreviewImageAttempts: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                attempts: {
                    id: string;
                    previewImageUrl: string | null;
                }[];
            };
            output: void;
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
    favorite: import("@trpc/server").TRPCBuiltRouter<{
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
        list: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: {
                bookmarkId: string;
                sortOrder: number;
                favoritedAt: Date;
                bookmark: {
                    id: string;
                    authorEmail: string;
                    authorName: string;
                    spaceId: string;
                    spaceName: string;
                    spaceImage: string | null;
                    spaceType: import(".prisma/client").$Enums.SpaceType;
                    tags: string[];
                    name: string;
                    url: string;
                    description: string | null;
                    faviconUrl: string | null;
                    faviconAttemptedAt: Date | null;
                    faviconAttemptCount: number;
                    createdAt: Date;
                    updatedAt: Date;
                };
            }[];
            meta: object;
        }>;
        listIds: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: string[];
            meta: object;
        }>;
        add: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                bookmarkId: string;
            };
            output: void;
            meta: object;
        }>;
        remove: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                bookmarkId: string;
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
