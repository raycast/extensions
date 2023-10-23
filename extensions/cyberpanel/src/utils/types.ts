import { FTPAccountRequestBody, FTPAccountSuccessResponse } from "../types/ftp-accounts";
import { PackageRequestBody, PackageSuccessResponse } from "../types/packages";
import { UserRequestBody, UserSuccessResponse } from "../types/users";

export type VerifyLoginResponse = {
    status: 1;
    error_message: null;
}

export type RequestBody = UserRequestBody | PackageRequestBody | FTPAccountRequestBody;
export type SuccessResponse = VerifyLoginResponse | UserSuccessResponse | PackageSuccessResponse | FTPAccountSuccessResponse;

export type ErrorResponse = {
    [key: string]: 0;
} & {
    error_message: string;
}