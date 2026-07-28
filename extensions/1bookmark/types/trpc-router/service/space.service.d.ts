import { Prisma } from "@repo/db";
import type { SpaceType, UserAndSpace } from "@repo/db";
export declare class SpaceService {
    create(p: {
        type: SpaceType;
        ownerEmail: string;
        name: string;
        image: string;
        description: string;
        slackTeamId?: string | null;
    }): Promise<string>;
    get(p: {
        email?: string;
        spaceId: string;
    }): Promise<({
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
    }) | null>;
    leave(p: {
        email: string;
        spaceId: string;
    }): Promise<void>;
    leaveInTx(tx: Prisma.TransactionClient, p: {
        email: string;
        spaceId: string;
    }): Promise<void>;
    getUserAndSpace(p: {
        email: string;
        spaceId: string;
    }): Promise<{
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
    } | null>;
    removeMember(p: {
        targetUserAndSpace: UserAndSpace;
        actorEmail: string;
    }): Promise<void>;
    updateMemberRole(p: {
        actorEmail: string;
        targetEmail: string;
        spaceId: string;
        fromRole: 'OWNER' | 'ADMIN' | 'MEMBER' | 'READ';
        toRole: 'ADMIN' | 'MEMBER' | 'READ';
    }): Promise<void>;
    update(p: {
        email: string;
        spaceId: string;
        name?: string;
        image?: string;
        description?: string;
        slackTeamId?: string | null;
    }): Promise<void>;
    createMemberAuthPolicy(p: {
        email: string;
        spaceId: string;
        emailPattern: string;
        authCheckInterval: string;
    }): Promise<void>;
    deleteMemberAuthPolicy(p: {
        email: string;
        spaceId: string;
        emailPattern: string;
    }): Promise<void>;
    updateMemberAuthPolicy(p: {
        email: string;
        spaceId: string;
        emailPattern: string;
        authCheckInterval: string;
    }): Promise<void>;
    topUsedBookmarks(p: {
        spaceId: string;
        limit: number;
        range: '7d' | '30d' | '1y';
    }): Promise<{
        useCount: number;
        bookmark: {
            id: string;
            name: string;
            url: string;
            faviconUrl: string | null;
        };
    }[]>;
}
