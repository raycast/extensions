import { Toast, showToast } from "@raycast/api";
import {
  CreateBackupRequest,
  CreateBackupResponse,
  ErrorResponse,
  RequestBody,
  SuccessResponse,
  VerifyLoginResponse,
} from "../types";
import fetch, { FetchError } from "node-fetch";
import { API_HEADERS, API_URL, DEFAULT_API_BODY_SERVER_USER_NAME } from "./constants";
import {
  ChangeUserACLRequest,
  ChangeUserACLResponse,
  CreateUserRequest,
  CreateUserResponse,
  DeleteUserRequest,
  DeleteUserResponse,
  ListUsersResponse,
  ModifyUserRequest,
  ModifyUserResponse,
} from "../types/users";
import {
  CreatePackageRequest,
  CreatePackageResponse,
  DeletePackageRequest,
  DeletePackageResponse,
  ListPackagsResponse,
  ModifyPackageRequest,
  ModifyPackageResponse,
} from "../types/packages";
import {
  CreateFTPAccountRequest,
  CreateFTPAccountResponse,
  DeleteFTPAccountRequest,
  DeleteFTPAccountResponse,
  ListFTPAccountsInDomainRequest,
  ListFTPAccountsInDomainResponse,
} from "../types/ftp-accounts";
import {
  CreateEmailAccountRequest,
  CreateEmailAccountResponse,
  DeleteEmailAccountRequest,
  DeleteEmailAccountResponse,
  ListEmailAccountsInDomainRequest,
  ListEmailAccountsInDomainResponse,
} from "../types/email-accounts";
import {
  CreateDatabaseRequest,
  CreateDatabaseResponse,
  DeleteDatabaseRequest,
  DeleteDatabaseResponse,
  ListDatabasesInDomainRequest,
  ListDatabasesInDomainResponse,
} from "../types/databases";
import {
  CreateDNSRecordRequest,
  CreateDNSRecordResponse,
  DeleteDNSRecordRequest,
  DeleteDNSRecordResponse,
  ListDNSRecordsInDomainRequest,
  ListDNSRecordsInDomainResponse,
} from "../types/dns-records";
import {
  ChangeWebsiteLinuxUserPasswordRequest,
  ChangeWebsiteLinuxUserPasswordResponse,
  ChangeWebsitePHPVersionRequest,
  ChangeWebsitePHPVersionResponse,
  CreateWebsiteRequest,
  CreateWebsiteResponse,
  DeleteWebsiteRequest,
  DeleteWebsiteResponse,
  ListWebsitesRequest,
  ListWebsitesResponse,
} from "../types/websites";
import {
  CreateChildDomainRequest,
  CreateChildDomainResponse,
  DeleteChildDomainRequest,
  DeleteChildDomainResponse,
  ListChildDomainsRequest,
  ListChildDomainsResponse,
} from "../types/child-domains";

const callApi = async (endpoint: string, animatedToastMessage = "", body?: RequestBody) => {
  await showToast(Toast.Style.Animated, "Processing...", animatedToastMessage);

  try {
    const apiResponse = await fetch(API_URL, {
      headers: API_HEADERS,
      method: "POST",
      body: JSON.stringify({
        serverUserName: DEFAULT_API_BODY_SERVER_USER_NAME,
        controller: endpoint,
        ...body,
      }),
    });

    if (!apiResponse.ok) {
      const { status } = apiResponse;
      const error = `${status} Error`;

      const response = { error_message: error } as ErrorResponse;
      await showToast(Toast.Style.Failure, "Error", error);

      return response;
    } else {
      const response = (await apiResponse.json()) as ErrorResponse | SuccessResponse;

      if ("error_message" in response) {
        if (response.error_message !== "None") {
          const errorResponse = response as ErrorResponse;
          await showToast(Toast.Style.Failure, "Error", errorResponse.error_message);
        }
      }

      return response;
    }
  } catch (err) {
    const error = err as FetchError;
    const response = { error_message: error.code } as ErrorResponse;
    await showToast(Toast.Style.Failure, `${error.type} Error`, error.code);

    return response;
  }
};

export async function verifyLogin() {
  return (await callApi("verifyLogin", "Verifying Login")) as ErrorResponse | VerifyLoginResponse;
}

export async function createBackup(body: CreateBackupRequest) {
  return (await callApi("submitBackupCreation", "Creating Backup", body)) as ErrorResponse | CreateBackupResponse;
}

// Users
export async function listUsers() {
  return (await callApi("fetchUsers", "Fetching Users")) as ErrorResponse | ListUsersResponse;
}
export async function createUser(body: CreateUserRequest) {
  return (await callApi("submitUserCreation", "Creating User", body)) as ErrorResponse | CreateUserResponse;
}
export async function modifyUser(body: ModifyUserRequest) {
  return (await callApi("saveModificationsUser", "Modifying User", body)) as ErrorResponse | ModifyUserResponse;
}
export async function changeUserACL(body: ChangeUserACLRequest) {
  return (await callApi("changeACLFunc", "Changing User ACL", body)) as ErrorResponse | ChangeUserACLResponse;
}
export async function deleteUser(body: DeleteUserRequest) {
  return (await callApi("submitUserDeletion", "Deleting User", body)) as ErrorResponse | DeleteUserResponse;
}

// Packages
export async function listPackages() {
  return (await callApi("fetchPackages", "Fetching Packages")) as ErrorResponse | ListPackagsResponse;
}
export async function createPackage(body: CreatePackageRequest) {
  return (await callApi("submitPackage", "Creating Package", body)) as ErrorResponse | CreatePackageResponse;
}
export async function modifyPackage(body: ModifyPackageRequest) {
  return (await callApi("submitPackageModify", "Modifying Package", body)) as ErrorResponse | ModifyPackageResponse;
}
export async function deletePackage(body: DeletePackageRequest) {
  return (await callApi("submitPackageDelete", "Deleting Package", body)) as ErrorResponse | DeletePackageResponse;
}

// FTP Accounts
export async function listFTPAccountsInDomain(body: ListFTPAccountsInDomainRequest) {
  return (await callApi("getAllFTPAccounts", "Fetching FTP Accounts", body)) as
    | ErrorResponse
    | ListFTPAccountsInDomainResponse;
}
export async function createFTPAccount(body: CreateFTPAccountRequest) {
  return (await callApi("submitFTPCreation", "Creating FTP Account", body)) as ErrorResponse | CreateFTPAccountResponse;
}
export async function deleteFTPAccount(body: DeleteFTPAccountRequest) {
  return (await callApi("submitFTPDelete", "Deleting FTP Account", body)) as ErrorResponse | DeleteFTPAccountResponse;
}

// Emails
export async function listEmailAccountsInDomain(body: ListEmailAccountsInDomainRequest) {
  return (await callApi("getEmailsForDomain", "Fetching Email Accounts", body)) as
    | ErrorResponse
    | ListEmailAccountsInDomainResponse;
}
export async function createEmailAccount(body: CreateEmailAccountRequest) {
  return (await callApi("submitEmailCreation", "Creating Email Account", body)) as
    | ErrorResponse
    | CreateEmailAccountResponse;
}
export async function deleteEmailAccount(body: DeleteEmailAccountRequest) {
  return (await callApi("submitEmailDeletion", "Deleting Email Account", body)) as
    | ErrorResponse
    | DeleteEmailAccountResponse;
}

// Databases
export async function listDatabasesInDomain(body: ListDatabasesInDomainRequest) {
  return (await callApi("fetchDatabases", "Fetching Databases", body)) as ErrorResponse | ListDatabasesInDomainResponse;
}
export async function createDatabase(body: CreateDatabaseRequest) {
  return (await callApi("submitDBCreation", "Creating Database", body)) as ErrorResponse | CreateDatabaseResponse;
}
export async function deleteDatabase(body: DeleteDatabaseRequest) {
  return (await callApi("submitDatabaseDeletion", "Deleting Database", body)) as ErrorResponse | DeleteDatabaseResponse;
}

// DNS
export async function listDNSRecordsInDomain(body: ListDNSRecordsInDomainRequest) {
  return (await callApi("getCurrentRecordsForDomain", "Fetching DNS Records", body)) as
    | ErrorResponse
    | ListDNSRecordsInDomainResponse;
}
export async function createDNSRecord(body: CreateDNSRecordRequest) {
  return (await callApi("addDNSRecord", "Creating DNS Record", body)) as ErrorResponse | CreateDNSRecordResponse;
}
export async function deleteDNSRecord(body: DeleteDNSRecordRequest) {
  return (await callApi("deleteDNSRecord", "Deleting DNS Record", body)) as ErrorResponse | DeleteDNSRecordResponse;
}

// Websites
export async function listWebsites(body: ListWebsitesRequest) {
  return (await callApi("fetchWebsites", "Fetching Websites", body)) as ErrorResponse | ListWebsitesResponse;
}
export async function createWebsite(body: CreateWebsiteRequest) {
  return (await callApi("submitWebsiteCreation", "Creating Website", body)) as ErrorResponse | CreateWebsiteResponse;
}
export async function deleteWebsite(body: DeleteWebsiteRequest) {
  return (await callApi("submitWebsiteDeletion", "Deleting Website", body)) as ErrorResponse | DeleteWebsiteResponse;
}
export async function changeWebsitePHPVersion(body: ChangeWebsitePHPVersionRequest) {
  return (await callApi("changePHP", "Changing Website PHP Version", body)) as
    | ErrorResponse
    | ChangeWebsitePHPVersionResponse;
}
export async function changeWebsiteLinuxUserPassword(body: ChangeWebsiteLinuxUserPasswordRequest) {
  return (await callApi("ChangeLinuxUserPassword", "Changing Website Linux User Password", body)) as
    | ErrorResponse
    | ChangeWebsiteLinuxUserPasswordResponse;
}

// Child Domains
export async function getChildDomains(body: ListChildDomainsRequest) {
  return (await callApi("fetchDomains", "Fetching Child Domains", body)) as ErrorResponse | ListChildDomainsResponse;
}
export async function deleteChildDomain(body: DeleteChildDomainRequest) {
  return (await callApi("submitDomainDeletion", "Deleting Child Domain", body)) as
    | ErrorResponse
    | DeleteChildDomainResponse;
}
export async function createChildDomain(body: CreateChildDomainRequest) {
  return (await callApi("submitDomainCreation", "Creating Child Domain", body)) as
    | ErrorResponse
    | CreateChildDomainResponse;
}
