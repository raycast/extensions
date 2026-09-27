import { BillingProviderType, BillingPlan } from '@repo/db';
import * as _trpc_server from '@trpc/server';
import { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import * as zod from 'zod';
import * as _prisma_client from '.prisma/client';
import * as _prisma_client_runtime_library from '@prisma/client/runtime/library';

type BillingInterval = "month" | "year";
type ProductPrice = {
    priceKrw: number;
    listPriceKrw: number;
};
type PlanLimits = {
    ownedSpaces: number | null;
    bookmarks: number | null;
    teamSpaceMembers: number | null;
};

type CheckoutOrder = {
    plan: Exclude<BillingPlan, "FREE">;
    seats: number;
    interval: BillingInterval;
    amountKrw: number;
    listAmountKrw: number;
    currency: "KRW";
};
type CheckoutTicket = {
    provider: BillingProviderType;
    checkoutUrl: string;
    checkoutId: string;
    order: CheckoutOrder;
};

type EntitlementSource = "FREE" | "SUBSCRIPTION" | "SEAT" | "GRANT";

type StatsRange = "7d" | "30d" | "90d" | "270d" | "1y";

interface TagSuggestion {
    name: string;
    score: number;
    isNew: boolean;
}

interface PageMeta {
    title: string | null;
    ogImage: string | null;
}

type AvatarSource = 'github' | 'gravatar' | 'custom' | 'none';

declare const appRouter: _trpc_server.TRPCBuiltRouter<{
    ctx: {
        db: _prisma_client.PrismaClient<{
            log: "error"[];
        }, never, _prisma_client_runtime_library.DefaultArgs>;
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
            zodError: zod.typeToFlattenedError<any, string> | null;
            planLimit: {
                limitKey: "ownedSpaces" | "bookmarks" | "teamSpaceMembers";
                plan: string;
                limit: number;
                current: number;
                actorIsOwner: boolean | null;
                oneTimePassesLeft: number | null;
            } | null;
            code: _trpc_server.TRPC_ERROR_CODE_KEY;
            httpStatus: number;
            path?: string;
            stack?: string;
        };
        message: string;
        code: _trpc_server.TRPC_ERROR_CODE_NUMBER;
    };
    transformer: true;
}, _trpc_server.TRPCDecorateCreateRouterOptions<{
    hello: _trpc_server.TRPCBuiltRouter<{
        ctx: {
            db: _prisma_client.PrismaClient<{
                log: "error"[];
            }, never, _prisma_client_runtime_library.DefaultArgs>;
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
                zodError: zod.typeToFlattenedError<any, string> | null;
                planLimit: {
                    limitKey: "ownedSpaces" | "bookmarks" | "teamSpaceMembers";
                    plan: string;
                    limit: number;
                    current: number;
                    actorIsOwner: boolean | null;
                    oneTimePassesLeft: number | null;
                } | null;
                code: _trpc_server.TRPC_ERROR_CODE_KEY;
                httpStatus: number;
                path?: string;
                stack?: string;
            };
            message: string;
            code: _trpc_server.TRPC_ERROR_CODE_NUMBER;
        };
        transformer: true;
    }, _trpc_server.TRPCDecorateCreateRouterOptions<{
        get: _trpc_server.TRPCQueryProcedure<{
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
    user: _trpc_server.TRPCBuiltRouter<{
        ctx: {
            db: _prisma_client.PrismaClient<{
                log: "error"[];
            }, never, _prisma_client_runtime_library.DefaultArgs>;
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
                zodError: zod.typeToFlattenedError<any, string> | null;
                planLimit: {
                    limitKey: "ownedSpaces" | "bookmarks" | "teamSpaceMembers";
                    plan: string;
                    limit: number;
                    current: number;
                    actorIsOwner: boolean | null;
                    oneTimePassesLeft: number | null;
                } | null;
                code: _trpc_server.TRPC_ERROR_CODE_KEY;
                httpStatus: number;
                path?: string;
                stack?: string;
            };
            message: string;
            code: _trpc_server.TRPC_ERROR_CODE_NUMBER;
        };
        transformer: true;
    }, _trpc_server.TRPCDecorateCreateRouterOptions<{
        subscribeTag: _trpc_server.TRPCMutationProcedure<{
            input: {
                spaceId: string;
                tagName: string;
            };
            output: undefined;
            meta: object;
        }>;
        unsubscribeTag: _trpc_server.TRPCMutationProcedure<{
            input: {
                spaceId: string;
                tagName: string;
            };
            output: undefined;
            meta: object;
        }>;
        me: _trpc_server.TRPCQueryProcedure<{
            input: {
                device?: string | undefined;
            } | undefined;
            output: {
                avatarUrl: string | null;
                avatarSource: AvatarSource;
                associatedSpaces: {
                    _count: {
                        users: number;
                        bookmarks: number;
                    };
                    myTags: string[];
                    myRole: _prisma_client.$Enums.TeamRole;
                    myStatus: _prisma_client.$Enums.TeamMemberStatus;
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
                    type: _prisma_client.$Enums.SpaceType;
                    status: string | null;
                    description: string | null;
                    id: string;
                    createdAt: Date;
                    name: string;
                    updatedAt: Date;
                    image: string | null;
                    joinMode: _prisma_client.$Enums.SpaceJoinMode;
                    slackTeamId: string | null;
                    memberListHidden: boolean;
                }[];
                createdAt: Date;
                name: string;
                email: string;
                updatedAt: Date;
                image: string | null;
                profileImageUrl: string | null;
                profileImageCheckedAt: Date | null;
            };
            meta: object;
        }>;
        listBySpaceId: _trpc_server.TRPCQueryProcedure<{
            input: string;
            output: {
                avatarUrl: string | null;
                user: {
                    createdAt: Date;
                    name: string;
                    email: string;
                    updatedAt: Date;
                    image: string | null;
                    profileImageUrl: string | null;
                    profileImageCheckedAt: Date | null;
                };
                status: _prisma_client.$Enums.TeamMemberStatus;
                spaceId: string;
                createdAt: Date;
                email: string;
                updatedAt: Date;
                image: string | null;
                tags: string[];
                nickname: string | null;
                authEmail: string | null;
                role: _prisma_client.$Enums.TeamRole;
            }[];
            meta: object;
        }>;
        inviteMembers: _trpc_server.TRPCMutationProcedure<{
            input: {
                spaceId: string;
                emails: string[];
                role?: "ADMIN" | "MEMBER" | "READ" | undefined;
            };
            output: void;
            meta: object;
        }>;
        refreshProfileImage: _trpc_server.TRPCMutationProcedure<{
            input: void;
            output: {
                avatarUrl: string | null;
                avatarSource: AvatarSource;
            };
            meta: object;
        }>;
        updateName: _trpc_server.TRPCMutationProcedure<{
            input: {
                name: string;
            };
            output: void;
            meta: object;
        }>;
        listSessions: _trpc_server.TRPCQueryProcedure<{
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
        revokeSession: _trpc_server.TRPCMutationProcedure<{
            input: {
                jti: string;
            };
            output: void;
            meta: object;
        }>;
        listBlockingOwnerships: _trpc_server.TRPCQueryProcedure<{
            input: void;
            output: {
                id: string;
                name: string;
            }[];
            meta: object;
        }>;
        deleteAccount: _trpc_server.TRPCMutationProcedure<{
            input: {
                confirmEmail: string;
            };
            output: void;
            meta: object;
        }>;
        revokeOtherSessions: _trpc_server.TRPCMutationProcedure<{
            input: void;
            output: {
                count: number;
            };
            meta: object;
        }>;
    }>>;
    bookmark: _trpc_server.TRPCBuiltRouter<{
        ctx: {
            db: _prisma_client.PrismaClient<{
                log: "error"[];
            }, never, _prisma_client_runtime_library.DefaultArgs>;
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
                zodError: zod.typeToFlattenedError<any, string> | null;
                planLimit: {
                    limitKey: "ownedSpaces" | "bookmarks" | "teamSpaceMembers";
                    plan: string;
                    limit: number;
                    current: number;
                    actorIsOwner: boolean | null;
                    oneTimePassesLeft: number | null;
                } | null;
                code: _trpc_server.TRPC_ERROR_CODE_KEY;
                httpStatus: number;
                path?: string;
                stack?: string;
            };
            message: string;
            code: _trpc_server.TRPC_ERROR_CODE_NUMBER;
        };
        transformer: true;
    }, _trpc_server.TRPCDecorateCreateRouterOptions<{
        hello: _trpc_server.TRPCQueryProcedure<{
            input: {
                text: string;
            };
            output: {
                greeting: string;
            };
            meta: object;
        }>;
        fetchPageTitle: _trpc_server.TRPCQueryProcedure<{
            input: {
                url: string;
            };
            output: string | null;
            meta: object;
        }>;
        fetchPageMeta: _trpc_server.TRPCQueryProcedure<{
            input: {
                url: string;
            };
            output: PageMeta;
            meta: object;
        }>;
        suggestTags: _trpc_server.TRPCQueryProcedure<{
            input: {
                spaceId: string;
                name: string;
                url: string;
                description?: string | undefined;
            };
            output: TagSuggestion[];
            meta: object;
        }>;
        create: _trpc_server.TRPCMutationProcedure<{
            input: {
                description: string;
                spaceId: string;
                name: string;
                tags: string[];
                url: string;
                deviceId?: string | undefined;
                useOneTimePass?: boolean | undefined;
            };
            output: {
                description: string | null;
                spaceId: string;
                id: string;
                createdAt: Date;
                name: string;
                updatedAt: Date;
                tags: string[];
                deletedAt: Date | null;
                url: string;
                faviconUrl: string | null;
                faviconAttemptedAt: Date | null;
                faviconAttemptCount: number;
                previewImageUrl: string | null;
                previewImageAttemptedAt: Date | null;
                previewImageAttemptCount: number;
                author: string;
                authorEmail: string;
            };
            meta: object;
        }>;
        listAll: _trpc_server.TRPCQueryProcedure<{
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
                spaceType: _prisma_client.$Enums.SpaceType;
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
        listRecent: _trpc_server.TRPCQueryProcedure<{
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
                spaceType: _prisma_client.$Enums.SpaceType;
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
        delete: _trpc_server.TRPCMutationProcedure<{
            input: string;
            output: void;
            meta: object;
        }>;
        transfer: _trpc_server.TRPCMutationProcedure<{
            input: {
                mode: "copy" | "move";
                targetSpaceId: string;
                bookmarkIds: string[];
            };
            output: {
                mode: "copy" | "move";
                targetSpaceId: string;
                transferred: number;
                skipped: number;
            };
            meta: object;
        }>;
        deleteMany: _trpc_server.TRPCMutationProcedure<{
            input: {
                bookmarkIds: string[];
            };
            output: {
                deleted: number;
            };
            meta: object;
        }>;
        getDetail: _trpc_server.TRPCQueryProcedure<{
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
                    avatarUrl: string | null;
                };
                space: {
                    type: _prisma_client.$Enums.SpaceType;
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
        usageRanked: _trpc_server.TRPCQueryProcedure<{
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
                        spaceType: _prisma_client.$Enums.SpaceType;
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
                        spaceType: _prisma_client.$Enums.SpaceType;
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
        exists: _trpc_server.TRPCQueryProcedure<{
            input: {
                spaceId: string;
                url: string;
            };
            output: boolean;
            meta: object;
        }>;
        update: _trpc_server.TRPCMutationProcedure<{
            input: {
                id: string;
                description?: string | undefined;
                name?: string | undefined;
                tags?: string[] | undefined;
                url?: string | undefined;
            };
            output: {
                description: string | null;
                spaceId: string;
                id: string;
                createdAt: Date;
                name: string;
                updatedAt: Date;
                tags: string[];
                deletedAt: Date | null;
                url: string;
                faviconUrl: string | null;
                faviconAttemptedAt: Date | null;
                faviconAttemptCount: number;
                previewImageUrl: string | null;
                previewImageAttemptedAt: Date | null;
                previewImageAttemptCount: number;
                author: string;
                authorEmail: string;
            };
            meta: object;
        }>;
        reportFaviconAttempts: _trpc_server.TRPCMutationProcedure<{
            input: {
                attempts: {
                    id: string;
                    faviconUrl: string | null;
                }[];
            };
            output: void;
            meta: object;
        }>;
        reportPreviewImageAttempts: _trpc_server.TRPCMutationProcedure<{
            input: {
                attempts: {
                    id: string;
                    previewImageUrl: string | null;
                }[];
            };
            output: void;
            meta: object;
        }>;
        import: _trpc_server.TRPCMutationProcedure<{
            input: {
                bookmarks: {
                    name: string;
                    url: string;
                    description?: string | undefined;
                    tags?: string[] | undefined;
                }[];
                spaceId: string;
                tags: string[];
                browserName: string;
                duplicateStrategy?: "skip" | "overwrite" | undefined;
            };
            output: {
                imported: number;
                overwritten: number;
                skipped: number;
            };
            meta: object;
        }>;
    }>>;
    favorite: _trpc_server.TRPCBuiltRouter<{
        ctx: {
            db: _prisma_client.PrismaClient<{
                log: "error"[];
            }, never, _prisma_client_runtime_library.DefaultArgs>;
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
                zodError: zod.typeToFlattenedError<any, string> | null;
                planLimit: {
                    limitKey: "ownedSpaces" | "bookmarks" | "teamSpaceMembers";
                    plan: string;
                    limit: number;
                    current: number;
                    actorIsOwner: boolean | null;
                    oneTimePassesLeft: number | null;
                } | null;
                code: _trpc_server.TRPC_ERROR_CODE_KEY;
                httpStatus: number;
                path?: string;
                stack?: string;
            };
            message: string;
            code: _trpc_server.TRPC_ERROR_CODE_NUMBER;
        };
        transformer: true;
    }, _trpc_server.TRPCDecorateCreateRouterOptions<{
        list: _trpc_server.TRPCQueryProcedure<{
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
                    spaceType: _prisma_client.$Enums.SpaceType;
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
        listIds: _trpc_server.TRPCQueryProcedure<{
            input: void;
            output: string[];
            meta: object;
        }>;
        add: _trpc_server.TRPCMutationProcedure<{
            input: {
                bookmarkId: string;
            };
            output: void;
            meta: object;
        }>;
        remove: _trpc_server.TRPCMutationProcedure<{
            input: {
                bookmarkId: string;
            };
            output: void;
            meta: object;
        }>;
    }>>;
    space: _trpc_server.TRPCBuiltRouter<{
        ctx: {
            db: _prisma_client.PrismaClient<{
                log: "error"[];
            }, never, _prisma_client_runtime_library.DefaultArgs>;
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
                zodError: zod.typeToFlattenedError<any, string> | null;
                planLimit: {
                    limitKey: "ownedSpaces" | "bookmarks" | "teamSpaceMembers";
                    plan: string;
                    limit: number;
                    current: number;
                    actorIsOwner: boolean | null;
                    oneTimePassesLeft: number | null;
                } | null;
                code: _trpc_server.TRPC_ERROR_CODE_KEY;
                httpStatus: number;
                path?: string;
                stack?: string;
            };
            message: string;
            code: _trpc_server.TRPC_ERROR_CODE_NUMBER;
        };
        transformer: true;
    }, _trpc_server.TRPCDecorateCreateRouterOptions<{
        delete: _trpc_server.TRPCMutationProcedure<{
            input: {
                spaceId: string;
            };
            output: {
                spaceId: string;
            };
            meta: object;
        }>;
        create: _trpc_server.TRPCMutationProcedure<{
            input: {
                name: string;
                image: string;
                type?: "TEAM" | "PERSONAL" | undefined;
                description?: string | undefined;
                slackTeamId?: string | undefined;
                withSampleTags?: boolean | undefined;
            };
            output: {
                spaceId: string;
            };
            meta: object;
        }>;
        suggestEmoji: _trpc_server.TRPCQueryProcedure<{
            input: {
                name: string;
                description?: string | undefined;
            };
            output: {
                emoji: "🔒" | "🚀" | "💻" | "🎨" | "📊" | "💰" | "📈" | "🧪" | "🤖" | "⚙️" | "📚" | "📝" | "🗂️" | "🏢" | "👥" | "🎯" | "🛠️" | "📱" | "🌐" | "🎮" | "🎬" | "🎵" | "📷" | "🍳" | "✈️" | "🏠" | "🏃" | "🐶" | "🌱" | "⚖️" | "🏥" | "🛒" | "🔖" | null;
            };
            meta: object;
        }>;
        leave: _trpc_server.TRPCMutationProcedure<{
            input: {
                spaceId: string;
            };
            output: void;
            meta: object;
        }>;
        get: _trpc_server.TRPCQueryProcedure<{
            input: {
                spaceId: string;
            };
            output: ({
                _count: {
                    bookmarks: number;
                    users: number;
                    tags: number;
                    memberAuthPolicies: number;
                };
                users: {
                    status: _prisma_client.$Enums.TeamMemberStatus;
                    spaceId: string;
                    createdAt: Date;
                    email: string;
                    updatedAt: Date;
                    image: string | null;
                    tags: string[];
                    nickname: string | null;
                    authEmail: string | null;
                    role: _prisma_client.$Enums.TeamRole;
                }[];
                memberAuthPolicies: {
                    spaceId: string;
                    createdAt: Date;
                    updatedAt: Date;
                    emailPattern: string;
                    authCheckIntervalSec: number;
                }[];
            } & {
                type: _prisma_client.$Enums.SpaceType;
                status: string | null;
                description: string | null;
                id: string;
                createdAt: Date;
                name: string;
                updatedAt: Date;
                image: string | null;
                joinMode: _prisma_client.$Enums.SpaceJoinMode;
                slackTeamId: string | null;
                memberListHidden: boolean;
            }) | null;
            meta: object;
        }>;
        invitationPreview: _trpc_server.TRPCQueryProcedure<{
            input: {
                spaceId: string;
            };
            output: {
                id: string;
                name: string;
                image: string | null;
                memberCount: number | null;
                joinMode: _prisma_client.$Enums.SpaceJoinMode;
                allowedDomains: string[];
            };
            meta: object;
        }>;
        invitationInfo: _trpc_server.TRPCQueryProcedure<{
            input: {
                spaceId: string;
            };
            output: {
                id: string;
                name: string;
                image: string | null;
                memberCount: number | null;
                alreadyMember: boolean;
                pending: boolean;
                banned: boolean;
                joinMode: _prisma_client.$Enums.SpaceJoinMode;
                emailAllowed: boolean;
                allowedDomains: string[];
            };
            meta: object;
        }>;
        joinByInvitation: _trpc_server.TRPCMutationProcedure<{
            input: {
                spaceId: string;
            };
            output: {
                spaceId: string;
                status: "ACTIVATED";
            } | {
                spaceId: string;
                status: "PENDING";
            };
            meta: object;
        }>;
        approveJoinRequest: _trpc_server.TRPCMutationProcedure<{
            input: {
                spaceId: string;
                targetEmail: string;
            };
            output: void;
            meta: object;
        }>;
        rejectJoinRequest: _trpc_server.TRPCMutationProcedure<{
            input: {
                spaceId: string;
                targetEmail: string;
            };
            output: void;
            meta: object;
        }>;
        update: _trpc_server.TRPCMutationProcedure<{
            input: {
                spaceId: string;
                description?: string | undefined;
                name?: string | undefined;
                image?: string | undefined;
                joinMode?: "APPROVAL" | "AUTO" | undefined;
                slackTeamId?: string | undefined;
                myNickname?: string | undefined;
                myImage?: string | undefined;
            };
            output: void;
            meta: object;
        }>;
        removeUser: _trpc_server.TRPCMutationProcedure<{
            input: {
                spaceId: string;
                targetEmail: string;
            };
            output: void;
            meta: object;
        }>;
        updateMemberRole: _trpc_server.TRPCMutationProcedure<{
            input: {
                spaceId: string;
                role: "OWNER" | "ADMIN" | "MEMBER" | "READ";
                targetEmail: string;
            };
            output: void;
            meta: object;
        }>;
        overview: _trpc_server.TRPCQueryProcedure<{
            input: {
                spaceId: string;
                range?: "7d" | "30d" | "90d" | "270d" | "1y" | undefined;
            };
            output: {
                range: StatsRange;
                since: Date;
                bookmarkCount: number;
                recentBookmarkCount: number;
                recentBookmarks: {
                    authorName: string;
                    id: string;
                    createdAt: Date;
                    name: string;
                    url: string;
                    faviconUrl: string | null;
                    authorEmail: string;
                }[];
                tagCount: number;
                memberCount: number | null;
                activeMemberCount: number | null;
            };
            meta: object;
        }>;
        topUsedBookmarks: _trpc_server.TRPCQueryProcedure<{
            input: {
                spaceId: string;
                range?: "7d" | "30d" | "90d" | "270d" | "1y" | undefined;
                limit?: number | undefined;
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
    spaceAuth: _trpc_server.TRPCBuiltRouter<{
        ctx: {
            db: _prisma_client.PrismaClient<{
                log: "error"[];
            }, never, _prisma_client_runtime_library.DefaultArgs>;
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
                zodError: zod.typeToFlattenedError<any, string> | null;
                planLimit: {
                    limitKey: "ownedSpaces" | "bookmarks" | "teamSpaceMembers";
                    plan: string;
                    limit: number;
                    current: number;
                    actorIsOwner: boolean | null;
                    oneTimePassesLeft: number | null;
                } | null;
                code: _trpc_server.TRPC_ERROR_CODE_KEY;
                httpStatus: number;
                path?: string;
                stack?: string;
            };
            message: string;
            code: _trpc_server.TRPC_ERROR_CODE_NUMBER;
        };
        transformer: true;
    }, _trpc_server.TRPCDecorateCreateRouterOptions<{
        listAuthenticatedSpaceIds: _trpc_server.TRPCQueryProcedure<{
            input: void;
            output: string[];
            meta: object;
        }>;
        listAuthRequiredSpaceIds: _trpc_server.TRPCQueryProcedure<{
            input: void;
            output: string[];
            meta: object;
        }>;
        createMemberAuthPolicy: _trpc_server.TRPCMutationProcedure<{
            input: {
                spaceId: string;
                emailPattern: string;
                authCheckInterval?: string | undefined;
            };
            output: void;
            meta: object;
        }>;
        deleteMemberAuthPolicy: _trpc_server.TRPCMutationProcedure<{
            input: {
                spaceId: string;
                emailPattern: string;
            };
            output: void;
            meta: object;
        }>;
        updateMemberAuthPolicy: _trpc_server.TRPCMutationProcedure<{
            input: {
                spaceId: string;
                emailPattern: string;
                authCheckInterval: string;
            };
            output: void;
            meta: object;
        }>;
    }>>;
    tag: _trpc_server.TRPCBuiltRouter<{
        ctx: {
            db: _prisma_client.PrismaClient<{
                log: "error"[];
            }, never, _prisma_client_runtime_library.DefaultArgs>;
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
                zodError: zod.typeToFlattenedError<any, string> | null;
                planLimit: {
                    limitKey: "ownedSpaces" | "bookmarks" | "teamSpaceMembers";
                    plan: string;
                    limit: number;
                    current: number;
                    actorIsOwner: boolean | null;
                    oneTimePassesLeft: number | null;
                } | null;
                code: _trpc_server.TRPC_ERROR_CODE_KEY;
                httpStatus: number;
                path?: string;
                stack?: string;
            };
            message: string;
            code: _trpc_server.TRPC_ERROR_CODE_NUMBER;
        };
        transformer: true;
    }, _trpc_server.TRPCDecorateCreateRouterOptions<{
        get: _trpc_server.TRPCQueryProcedure<{
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
        list: _trpc_server.TRPCQueryProcedure<{
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
        create: _trpc_server.TRPCMutationProcedure<{
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
        delete: _trpc_server.TRPCMutationProcedure<{
            input: {
                spaceId: string;
                tagName: string;
            };
            output: void;
            meta: object;
        }>;
    }>>;
    activity: _trpc_server.TRPCBuiltRouter<{
        ctx: {
            db: _prisma_client.PrismaClient<{
                log: "error"[];
            }, never, _prisma_client_runtime_library.DefaultArgs>;
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
                zodError: zod.typeToFlattenedError<any, string> | null;
                planLimit: {
                    limitKey: "ownedSpaces" | "bookmarks" | "teamSpaceMembers";
                    plan: string;
                    limit: number;
                    current: number;
                    actorIsOwner: boolean | null;
                    oneTimePassesLeft: number | null;
                } | null;
                code: _trpc_server.TRPC_ERROR_CODE_KEY;
                httpStatus: number;
                path?: string;
                stack?: string;
            };
            message: string;
            code: _trpc_server.TRPC_ERROR_CODE_NUMBER;
        };
        transformer: true;
    }, _trpc_server.TRPCDecorateCreateRouterOptions<{
        create: _trpc_server.TRPCMutationProcedure<{
            input: {
                type: "BOOKMARK_OPEN" | "BOOKMARK_COPY";
                spaceId: string;
                data: {
                    bookmarkId: string;
                } & {
                    [k: string]: string;
                };
            };
            output: void;
            meta: object;
        }>;
    }>>;
    login: _trpc_server.TRPCBuiltRouter<{
        ctx: {
            db: _prisma_client.PrismaClient<{
                log: "error"[];
            }, never, _prisma_client_runtime_library.DefaultArgs>;
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
                zodError: zod.typeToFlattenedError<any, string> | null;
                planLimit: {
                    limitKey: "ownedSpaces" | "bookmarks" | "teamSpaceMembers";
                    plan: string;
                    limit: number;
                    current: number;
                    actorIsOwner: boolean | null;
                    oneTimePassesLeft: number | null;
                } | null;
                code: _trpc_server.TRPC_ERROR_CODE_KEY;
                httpStatus: number;
                path?: string;
                stack?: string;
            };
            message: string;
            code: _trpc_server.TRPC_ERROR_CODE_NUMBER;
        };
        transformer: true;
    }, _trpc_server.TRPCDecorateCreateRouterOptions<{
        generateMagicLink: _trpc_server.TRPCMutationProcedure<{
            input: {
                email: string;
                source?: "mobile" | "web" | "desktop" | undefined;
            };
            output: void;
            meta: object;
        }>;
    }>>;
    support: _trpc_server.TRPCBuiltRouter<{
        ctx: {
            db: _prisma_client.PrismaClient<{
                log: "error"[];
            }, never, _prisma_client_runtime_library.DefaultArgs>;
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
                zodError: zod.typeToFlattenedError<any, string> | null;
                planLimit: {
                    limitKey: "ownedSpaces" | "bookmarks" | "teamSpaceMembers";
                    plan: string;
                    limit: number;
                    current: number;
                    actorIsOwner: boolean | null;
                    oneTimePassesLeft: number | null;
                } | null;
                code: _trpc_server.TRPC_ERROR_CODE_KEY;
                httpStatus: number;
                path?: string;
                stack?: string;
            };
            message: string;
            code: _trpc_server.TRPC_ERROR_CODE_NUMBER;
        };
        transformer: true;
    }, _trpc_server.TRPCDecorateCreateRouterOptions<{
        create: _trpc_server.TRPCMutationProcedure<{
            input: {
                body: string;
                subject: string;
            };
            output: {
                id: string;
            };
            meta: object;
        }>;
        list: _trpc_server.TRPCQueryProcedure<{
            input: {
                cursor?: string | undefined;
            };
            output: {
                items: {
                    status: _prisma_client.$Enums.SupportTicketStatus;
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    subject: string;
                }[];
                nextCursor: string | undefined;
            };
            meta: object;
        }>;
        detail: _trpc_server.TRPCQueryProcedure<{
            input: {
                id: string;
            };
            output: {
                status: _prisma_client.$Enums.SupportTicketStatus;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                subject: string;
            };
            meta: object;
        }>;
        messages: _trpc_server.TRPCQueryProcedure<{
            input: {
                id: string;
                cursor?: string | undefined;
            };
            output: {
                items: {
                    id: string;
                    createdAt: Date;
                    body: string;
                    author: _prisma_client.$Enums.SupportMessageAuthor;
                    ticketId: string;
                }[];
                nextCursor: string | undefined;
            };
            meta: object;
        }>;
        reply: _trpc_server.TRPCMutationProcedure<{
            input: {
                id: string;
                body: string;
            };
            output: {
                id: string;
            };
            meta: object;
        }>;
    }>>;
    billing: _trpc_server.TRPCBuiltRouter<{
        ctx: {
            db: _prisma_client.PrismaClient<{
                log: "error"[];
            }, never, _prisma_client_runtime_library.DefaultArgs>;
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
                zodError: zod.typeToFlattenedError<any, string> | null;
                planLimit: {
                    limitKey: "ownedSpaces" | "bookmarks" | "teamSpaceMembers";
                    plan: string;
                    limit: number;
                    current: number;
                    actorIsOwner: boolean | null;
                    oneTimePassesLeft: number | null;
                } | null;
                code: _trpc_server.TRPC_ERROR_CODE_KEY;
                httpStatus: number;
                path?: string;
                stack?: string;
            };
            message: string;
            code: _trpc_server.TRPC_ERROR_CODE_NUMBER;
        };
        transformer: true;
    }, _trpc_server.TRPCDecorateCreateRouterOptions<{
        entitlement: _trpc_server.TRPCQueryProcedure<{
            input: void;
            output: {
                planLimits: Record<_prisma_client.$Enums.BillingPlan, PlanLimits>;
                ownSubscription: {
                    interval: BillingInterval;
                    plan: _prisma_client.$Enums.BillingPlan;
                    status: _prisma_client.$Enums.SubscriptionStatus;
                    seats: number;
                    currentPeriodEnd: Date | null;
                } | null;
                plan: _prisma_client.BillingPlan;
                source: EntitlementSource;
                seats: number;
                expiresAt: Date | null;
                status: _prisma_client.SubscriptionStatus | null;
                grantorEmail: string | null;
                limits: PlanLimits;
            };
            meta: object;
        }>;
        catalog: _trpc_server.TRPCQueryProcedure<{
            input: void;
            output: {
                currency: "KRW";
                teamSeats: {
                    readonly min: 2;
                    readonly max: 100;
                };
                plans: ({
                    id: _prisma_client.$Enums.BillingPlan | "PRO_LIFETIME";
                    plan: _prisma_client.$Enums.BillingPlan;
                    billing: "free" | "monthly";
                    priceKrw: number;
                    listPriceKrw: number;
                    yearly: ProductPrice | null;
                    contactSales: boolean;
                    purchasable: boolean;
                    comingSoon: boolean;
                    limits: PlanLimits;
                    familyCoupons: number;
                } | {
                    id: _prisma_client.$Enums.BillingPlan | "PRO_LIFETIME";
                    plan: _prisma_client.BillingPlan;
                    billing: "lifetime";
                    priceKrw: number;
                    listPriceKrw: number;
                    yearly: null;
                    contactSales: boolean;
                    purchasable: boolean;
                    comingSoon: boolean;
                    limits: PlanLimits;
                    familyCoupons: number;
                })[];
            };
            meta: object;
        }>;
        startCheckout: _trpc_server.TRPCMutationProcedure<{
            input: {
                plan: "PRO" | "TEAM";
                seats?: number | undefined;
                interval?: "month" | "year" | undefined;
                returnPath?: string | undefined;
            };
            output: CheckoutTicket;
            meta: object;
        }>;
        checkoutSummary: _trpc_server.TRPCQueryProcedure<{
            input: {
                checkoutId: string;
            };
            output: CheckoutOrder;
            meta: object;
        }>;
        confirmCheckout: _trpc_server.TRPCMutationProcedure<{
            input: {
                checkoutId: string;
                agreedToPaidTerms: true;
            };
            output: {
                ok: true;
                plan: _prisma_client.$Enums.BillingPlan;
            };
            meta: object;
        }>;
        cancel: _trpc_server.TRPCMutationProcedure<{
            input: void;
            output: {
                ok: true;
            };
            meta: object;
        }>;
        customerPortalUrl: _trpc_server.TRPCQueryProcedure<{
            input: void;
            output: {
                url: string | null;
            };
            meta: object;
        }>;
        seats: _trpc_server.TRPCQueryProcedure<{
            input: void;
            output: {
                periodEnd: Date | null;
                paid: {
                    used: number;
                    total: number;
                    members: {
                        email: string;
                        kind: string;
                        plan: string;
                        assignedAt: Date;
                    }[];
                } | null;
                coupons: {
                    used: number;
                    total: number;
                    members: {
                        email: string;
                        kind: string;
                        plan: string;
                        assignedAt: Date;
                    }[];
                };
            };
            meta: object;
        }>;
        assignSeat: _trpc_server.TRPCMutationProcedure<{
            input: {
                memberEmail: string;
                kind?: "PAID" | "SPONSORED" | undefined;
            };
            output: {
                email: string;
                kind: string;
                plan: string;
                assignedAt: Date;
            };
            meta: object;
        }>;
        releaseSeat: _trpc_server.TRPCMutationProcedure<{
            input: {
                memberEmail: string;
            };
            output: {
                ok: true;
            };
            meta: object;
        }>;
        redeemCode: _trpc_server.TRPCMutationProcedure<{
            input: {
                code: string;
            };
            output: {
                plan: _prisma_client.$Enums.BillingPlan;
                expiresAt: Date | null;
            };
            meta: object;
        }>;
        myGrants: _trpc_server.TRPCQueryProcedure<{
            input: void;
            output: {
                id: string;
                code: string;
                plan: _prisma_client.$Enums.BillingPlan;
                redeemedAt: Date | null;
                expiresAt: Date | null;
                revokedAt: Date | null;
            }[];
            meta: object;
        }>;
    }>>;
}>>;
type AppRouter = typeof appRouter;

type RouterInputs = inferRouterInputs<AppRouter>;
type RouterOutputs = inferRouterOutputs<AppRouter>;

export type { AppRouter, RouterInputs, RouterOutputs };
