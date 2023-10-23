import { UserRequestBody, UserSuccessResponse } from "../types/users";

export type VerifyLoginResponse = {
    status: 1;
    error_message: null;
}

export type RequestBody = UserRequestBody;
export type SuccessResponse = VerifyLoginResponse | UserSuccessResponse;

export type ErrorResponse = {
    [key: string]: 0;
} & {
    error_message: string;
}