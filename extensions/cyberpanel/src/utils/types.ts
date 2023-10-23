import { ChildDomainRequestBody, ChildDomainSuccessResponse } from "../types/child-domains";
import { DatabaseRequestBody, DatabaseSuccessResponse } from "../types/databases";
import { DNSRecordRequestBody, DNSRecordSuccessResponse } from "../types/dns-records";
import { EmailAccountRequestBody, EmailAccountSuccessResponse } from "../types/email-accounts";
import { FTPAccountRequestBody, FTPAccountSuccessResponse } from "../types/ftp-accounts";
import { PackageRequestBody, PackageSuccessResponse } from "../types/packages";
import { UserRequestBody, UserSuccessResponse } from "../types/users";
import { WebsiteRequestBody, WebsiteSuccessResponse } from "../types/websites";

export type VerifyLoginResponse = {
    status: 1;
    error_message: null;
}

export type CreateBackupRequest = {
    websiteToBeBacked: string;
}
export type CreateBackupResponse = {
    status: 1;
    metaStatus: 1;
    error_message: "None";
    tempStorage: string;
}

export type RequestBody = UserRequestBody | PackageRequestBody | FTPAccountRequestBody | EmailAccountRequestBody | DatabaseRequestBody | DNSRecordRequestBody | CreateBackupRequest | WebsiteRequestBody | ChildDomainRequestBody;
export type SuccessResponse = VerifyLoginResponse | UserSuccessResponse | PackageSuccessResponse | FTPAccountSuccessResponse | EmailAccountSuccessResponse | DatabaseSuccessResponse | DNSRecordSuccessResponse | CreateBackupResponse | WebsiteSuccessResponse | ChildDomainSuccessResponse;

export type ErrorResponse = {
    [key: string]: 0;
} & {
    error_message: string;
}