export declare class UserAndSpaceService {
    update(params: {
        email: string;
        spaceId: string;
        myNickname?: string;
        myImage?: string;
    }): Promise<void>;
}
