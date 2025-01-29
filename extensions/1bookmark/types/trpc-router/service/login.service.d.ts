export declare const loginRequest: (params: {
    email: string;
    preparedToken?: string;
}) => Promise<{
    email: string;
    token: string;
    expires: Date;
}>;
