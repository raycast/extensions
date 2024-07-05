import { Toast, showToast } from "@raycast/api";
import fetch, { FetchError } from "node-fetch";
import { HOSTNAME, USERNAME, ACCESS_KEY, SECRET_KEY } from "./constants";
import { AddDatabaseRequest, ListDatabasesResponse } from "./types/databases";
import { ErrorResponse, ListMailDomainsResponse, ListUserIPsResponse } from "./types";
import { AddWebDomainRequest, ListWebDomainAccesslogResponse, ListWebDomainErrorlogResponse, ListWebDomainSSLResponse, ListWebDomainsResponse } from "./types/web-domains";
import { AddUserRequest, ListUserAuthLogResponse, ListUserLogsResponse, ListUserNotificationsResponse, ListUserStatsResponse, ListUsersResponse } from "./types/users";
import { ListUserPackagesResponse } from "./types/packages";

const callApi = async (cmd: string, animatedToastMessage = "", body?: any) => {
  await showToast(Toast.Style.Animated, "Processing...", animatedToastMessage);

  try {
    const API_URL = new URL('api/', HOSTNAME);

    if (cmd.includes('web-domain')) {
        body = {
            arg1: USERNAME,
            ...body
        };
    }
    const apiResponse = await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify({
            hash: `${ACCESS_KEY}:${SECRET_KEY}`,
            cmd,
            ...body
        })
    });

    const { status } = apiResponse;
    if (!apiResponse.ok) {
        const error = `${status} Error`;

        const code = apiResponse.headers.get('Hestia-Exit-Code');
        const response = await apiResponse.text();
        
        await showToast(Toast.Style.Failure, error, `${code} - ${response}`);

        return { error: true };
      } else {
        if (status===204) return {};
        const response = await apiResponse.json();
        return response;
    }
  } catch (error) {
    let message = "Something went wrong";
    if (error instanceof FetchError) {
      message = error.message;
    } else if (error instanceof TypeError) {
      message = "Invalid URL - make sure the HestiaCP URL is valid";
    }
    await showToast({ title: "ERROR", message, style: Toast.Style.Failure });
    return { error: true };
  }
};


export async function getWebDomainAccesslog(user: string, domain: string) {
    const body = {
        arg1: user,
        arg2: domain,
        arg3: "70",
        arg4: "json"
    };
    return (await callApi("v-list-web-domain-accesslog", "Fetching Web Domain Accesslog", body)) as ErrorResponse | ListWebDomainAccesslogResponse;
}
export async function getWebDomainErrorlog(user: string, domain: string) {
    const body = {
        arg1: user,
        arg2: domain,
        arg3: "70",
        arg4: "json"
    };
    return (await callApi("v-list-web-domain-errorlog", "Fetching Web Domain Error Log", body)) as ErrorResponse | ListWebDomainErrorlogResponse;
}
export async function getWebDomainSSL(user: string, domain: string) {
    const body = {
        arg1: user,
        arg2: domain,
        arg3: "json"  
    };
    return (await callApi("v-list-web-domain-ssl", "Fetching Web Domain SSL", body)) as ErrorResponse | ListWebDomainSSLResponse;
}
export async function addWebDomain(newWebDomain: AddWebDomainRequest) {
    const body = {
        arg1: newWebDomain.user,
        arg2: newWebDomain.domain,
        arg3: newWebDomain.ip
    }
    return (await callApi("v-add-web-domain", "Adding Web Domain", body)) as ErrorResponse | Record<string, never>;
}
export async function deleteWebDomain(user: string, domain: string) {
    const body = {
        arg1: user,
        arg2: domain,
    }
    return (await callApi("v-delete-web-domain", "Deleting Web Domain", body)) as ErrorResponse | Record<string, never>;
}

// PACKAGES
export async function getUserPackages() {
    const body = { arg1: "json" };
    return (await callApi("v-list-user-packages", "Fetching User Packages", body)) as ErrorResponse | ListUserPackagesResponse;
}
// IPs
export async function getUserIPs(user: string) {
    const body = { arg1: user, arg2: "json" };
    return (await callApi("v-list-user-ips", "Fetching User IPs", body)) as ErrorResponse | ListUserIPsResponse;
}

// DATABASES
export async function getUserDatabases(user: string) {
    const body = { arg1: user, arg2: "json" };
    return (await callApi("v-list-databases", "Fetching Databases", body)) as ErrorResponse | ListDatabasesResponse;
}
export async function suspendUserDatabase(user: string, database: string) {
    const body = { arg1: user, arg2: database };
    return (await callApi("v-suspend-database", "Suspending Database", body)) as ErrorResponse | Record<string, never>;
}
export async function unususpendUserDatabase(user: string, database: string) {
    const body = { arg1: user, arg2: database };
    return (await callApi("v-unsuspend-database", "Unsuspending Database", body)) as ErrorResponse | Record<string, never>;
}
export async function suspendAllUserDatabases(user: string) {
    const body = { arg1: user };
    return (await callApi("v-suspend-databases", "Suspending All Databases", body)) as ErrorResponse | Record<string, never>;
}
export async function unususpendAllUserDatabases(user: string) {
    const body = { arg1: user };
    return (await callApi("v-unsuspend-databases", "Unsuspending All Databases", body)) as ErrorResponse | Record<string, never>;
}
export async function deleteUserDatabase(user: string, database: string) {
    const body = { arg1: user, arg2: database };
    return (await callApi("v-delete-database", "Deleting Database", body)) as ErrorResponse | Record<string, never>;
}
export async function addUserDatabase(newDatabase: AddDatabaseRequest) {
    const body = {
        arg1: newDatabase.user,
        arg2: newDatabase.database,
        arg3: newDatabase.db_user,
        arg4: newDatabase.db_pass,
    };
    return (await callApi("v-add-database", "Adding Database", body)) as ErrorResponse | Record<string, never>;
}

// MAIL
export async function getMailDomains(user: string) {
    const body = {
        arg1: user,
        arg2: "json"
    };
    return (await callApi("v-list-mail-domains", "Fetching Mail Domains", body)) as ErrorResponse | ListMailDomainsResponse;
}