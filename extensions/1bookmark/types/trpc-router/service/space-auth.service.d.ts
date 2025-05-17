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
     * 만료일과 상관없이 이메일 패턴만 검사
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
     * 만료와 상관없이 마지막으로 해당 Space에서 인증 받은 정보를 반환.
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
