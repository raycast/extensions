import type { ActivityType, Prisma } from "@repo/db";
export declare class ActivityService {
    create(params: {
        userId: string;
        spaceId: string;
        type: ActivityType;
        data: Record<string, any>;
    }, tx?: Prisma.TransactionClient): Promise<void>;
}
