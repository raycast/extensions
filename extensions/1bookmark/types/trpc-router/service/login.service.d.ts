export declare const loginRequest: (params: {
    email: string;
    preparedToken?: string;
}) => Promise<{
    email: string;
    expires: Date;
    token: string;
}>;
