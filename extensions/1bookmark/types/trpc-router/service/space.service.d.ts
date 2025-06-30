import type { SpaceType, UserAndSpace } from "@repo/db";
export declare class SpaceService {
    create(p: {
        type: SpaceType;
        ownerEmail: string;
        name: string;
        image: string;
        description: string;
    }): Promise<string>;
    get(p: {
        email?: string;
        spaceId: string;
    }): Promise<({
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
    }) | null>;
    leave(p: {
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
    update(p: {
        email: string;
        spaceId: string;
        name?: string;
        image?: string;
        description?: string;
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
}
