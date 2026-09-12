import { db } from "@repo/db";
export declare class UserService {
    get(email: string): Promise<{
        associatedSpaces: {
            myTags: string[];
            myRole: import(".prisma/client").$Enums.TeamRole;
            myStatus: import(".prisma/client").$Enums.TeamMemberStatus;
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
            image: string | null;
            slackTeamId: string | null;
            updatedAt: Date;
        }[];
        createdAt: Date;
        name: string;
        image: string | null;
        email: string;
        updatedAt: Date;
    }>;
    listBySpaceId(spaceId: string): Promise<({
        user: {
            createdAt: Date;
            name: string;
            image: string | null;
            email: string;
            updatedAt: Date;
        };
    } & {
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
    })[]>;
    inviteMembers(params: {
        space: Exclude<Awaited<ReturnType<typeof db.space.findUnique>>, null>;
        actorEmail: string;
        emails: string[];
        role: 'ADMIN' | 'MEMBER' | 'READ';
    }): Promise<void>;
    subscribeTag(p: {
        email: string;
        spaceId: string;
        tagName: string;
    }): Promise<void>;
    unsubscribeTag(p: {
        email: string;
        spaceId: string;
        tagName: string;
    }): Promise<void>;
    listSoleOwnerTeamSpaces(email: string): Promise<{
        id: string;
        name: string;
    }[]>;
    deleteAccount(email: string): Promise<{
        placeholderEmail: string;
    }>;
    update(p: {
        email: string;
        name?: string;
        image?: string;
    }): Promise<void>;
}
