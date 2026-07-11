export declare class TagService {
    getTag(p: {
        spaceId: string;
        tagName: string;
    }): Promise<{
        description: string | null;
        spaceId: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        icon: string | null;
    }>;
    updateTag(p: {
        spaceId: string;
        tagName: string;
        name: string;
        description: string;
    }): Promise<void>;
    list(p: {
        spaceIds: string[];
    }): Promise<({
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
    })[]>;
    create(p: {
        spaceId: string;
        name: string;
        author: string;
        icon?: string;
    }): Promise<{
        description: string | null;
        spaceId: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        icon: string | null;
    }>;
    delete(p: {
        spaceId: string;
        tagName: string;
        author: string;
    }): Promise<void>;
}
