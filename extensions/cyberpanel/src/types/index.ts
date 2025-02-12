import { ChildDomainRequestBody, ChildDomainSuccessResponse } from "./child-domains";
import { DatabaseRequestBody, DatabaseSuccessResponse } from "./databases";
import { DNSRecordRequestBody, DNSRecordSuccessResponse } from "./dns-records";
import { EmailAccountRequestBody, EmailAccountSuccessResponse } from "./email-accounts";
import { FTPAccountRequestBody, FTPAccountSuccessResponse } from "./ftp-accounts";
import { PackageRequestBody, PackageSuccessResponse } from "./packages";
import { UserRequestBody, UserSuccessResponse } from "./users";
import { WebsiteRequestBody, WebsiteSuccessResponse } from "./websites";

export type VerifyLoginResponse = {
  status: 1;
  error_message: null;
};

export type CreateBackupRequest = {
  websiteToBeBacked: string;
};
export type CreateBackupResponse = {
  status: 1;
  metaStatus: 1;
  error_message: "None";
  tempStorage: string;
};

export type RequestBody =
  | UserRequestBody
  | PackageRequestBody
  | FTPAccountRequestBody
  | EmailAccountRequestBody
  | DatabaseRequestBody
  | DNSRecordRequestBody
  | CreateBackupRequest
  | WebsiteRequestBody
  | ChildDomainRequestBody;
export type SuccessResponse =
  | VerifyLoginResponse
  | UserSuccessResponse
  | PackageSuccessResponse
  | FTPAccountSuccessResponse
  | EmailAccountSuccessResponse
  | DatabaseSuccessResponse
  | DNSRecordSuccessResponse
  | CreateBackupResponse
  | WebsiteSuccessResponse
  | ChildDomainSuccessResponse;

export type ErrorResponse = {
  [key: string]: 0;
} & {
  status: 0;
  error_message: string;
};
