export declare class SpaceAuthService {
    listAuthenticatedSpaceIds(params: {
        spaceIds: string[];
        accessToken: string;
    }): Promise<string[]>;
    getSession(accessToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
        userId: string;
        createdAt: Date;
        email: string;
        updatedAt: Date;
        expires: Date;
        sessionId: string;
        deviceName: string | null;
    }>;
    hasValidSpaceAuthByEmailOrEmailPattern(params: {
        memberAuthPolicies: {
            emailPattern: string;
            authCheckIntervalSec: number;
        }[];
        authEmail: string;
        authAge: number;
    }): boolean;
    hasValidSpaceAuth(params: {
        spaceId: string;
        session: {
            createdAt: Date;
            email: string;
            sessionId: string;
        };
        authEmailToAdd?: string;
        policyToAdd?: {
            emailPattern: string;
            authCheckIntervalSec: number;
        };
        policyToRemove?: {
            emailPattern: string;
        };
    }): Promise<boolean>;
    getSpaceAuth(params: {
        spaceId: string;
        session: {
            createdAt: Date;
            email: string;
            sessionId: string;
        };
        authEmailToAdd?: string;
    }): Promise<{
        authEmail: string;
        updatedAt: Date;
    }>;
    listAllowedEmailPatterns(params: {
        spaceId: string;
    }): Promise<string[]>;
    sendAuthCode(params: {
        email: string;
        spaceId: string;
        authEmail: string;
    }): Promise<void>;
    verifyAuthCode(params: {
        email: string;
        spaceId: string;
        authEmail: string;
        code: string;
        sessionId: string;
    }): Promise<void>;
    listMemberAuthPolicies(params: {
        spaceId: string;
        email: string;
    }): Promise<string[]>;
}
