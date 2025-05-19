export declare class SpaceAuthService {
    listAuthenticatedSpaceIds(params: {
        spaceIds: string[];
        accessToken: string;
    }): Promise<string[]>;
    hasValidSpaceAuthByEmailOrEmailPattern(params: {
        memberAuthPolicies: {
            emailPattern: string;
            authCheckIntervalSec: number;
        }[];
        emailOrEmailPattern: string;
        authAge: number;
    }): boolean;
    hasValidSpaceAuth(params: {
        spaceId: string;
        session: {
            createdAt: Date;
            email: string;
            sessionId: string;
        };
    }): Promise<boolean>;
    /**
     * Check email pattern only, regardless of expiration date
     */
    checkEmailPatternPolicy(params: {
        spaceId: string;
        email: string;
    }): Promise<void>;
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
    /**
     * Returns the last verified information from the Space regardless of expiration.
     */
    getLastVerifiedEmail(params: {
        email: string;
        spaceId: string;
        sessionId: string;
    }): Promise<any>;
    listMemberAuthPolicies(params: {
        spaceId: string;
        email: string;
    }): Promise<string[]>;
}
