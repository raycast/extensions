import { db } from "@repo/db";
export declare class UserService {
    get(email: string): Promise<{
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
    }>;
    listBySpaceId(spaceId: string): Promise<({
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
    })[]>;
    inviteMembers(params: {
        space: Exclude<Awaited<ReturnType<typeof db.space.findUnique>>, null>;
        actorEmail: string;
        emails: string[];
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
    update(p: {
        email: string;
        name?: string;
        image?: string;
    }): Promise<void>;
    getSessionId(p: {
        accessToken: string;
    }): Promise<string | undefined>;
}
