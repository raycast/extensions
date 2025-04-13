import { SpaceType } from "@repo/db";
export declare class SpaceService {
    create(p: {
        type: SpaceType;
        ownerEmail: string;
        name: string;
        image: string;
        description: string;
    }): Promise<string>;
    get(p: {
        spaceId: string;
    }): Promise<({
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
        actorEmail: string;
        targetEmail: string;
        spaceId: string;
    }): Promise<void>;
    update(p: {
        email: string;
        spaceId: string;
        name?: string;
        image?: string;
        description?: string;
    }): Promise<void>;
}
