import type { Prisma, SpaceType, UserAndSpace } from "@repo/db";
export declare class SpaceService {
    /**
     * 스페이스와 그 스코프에 종속된 데이터를 영구 삭제한다.
     *
     * Prisma 관계가 모두 RESTRICT이고 TeamPlanHistory는 외래키가 없으므로 삭제 순서와
     * 대상을 명시적으로 관리한다. 어느 단계라도 실패하면 전체 삭제를 롤백한다.
     */
    delete(p: {
        actorEmail: string;
        spaceId: string;
    }): Promise<{
        spaceId: string;
    }>;
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
        users: {
            status: import(".prisma/client").$Enums.TeamMemberStatus;
            spaceId: string;
            createdAt: Date;
            image: string | null;
            email: string;
            updatedAt: Date;
            tags: string[];
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
            bookmarks: number;
            users: number;
            tags: number;
            memberAuthPolicies: number;
        };
    } & {
        type: import(".prisma/client").$Enums.SpaceType;
        status: string | null;
        description: string | null;
        id: string;
        createdAt: Date;
        name: string;
        image: string | null;
        slackTeamId: string | null;
        updatedAt: Date;
    }) | null>;
    getInvitationInfo(p: {
        email: string;
        spaceId: string;
    }): Promise<{
        id: string;
        name: string;
        image: string | null;
        memberCount: number;
        alreadyMember: boolean;
        pending: boolean;
        banned: boolean;
    }>;
    joinByInvitation(p: {
        email: string;
        spaceId: string;
    }): Promise<{
        spaceId: string;
        status: "ACTIVATED";
    } | {
        spaceId: string;
        status: "PENDING";
    }>;
    approveJoinRequest(p: {
        actorEmail: string;
        spaceId: string;
        targetEmail: string;
    }): Promise<void>;
    rejectJoinRequest(p: {
        actorEmail: string;
        spaceId: string;
        targetEmail: string;
    }): Promise<void>;
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
        image: string | null;
        email: string;
        updatedAt: Date;
        tags: string[];
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
        fromRole: "OWNER" | "ADMIN" | "MEMBER" | "READ";
        toRole: "ADMIN" | "MEMBER" | "READ";
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
        range: "7d" | "30d" | "1y";
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
