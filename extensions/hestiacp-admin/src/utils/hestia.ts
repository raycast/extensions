import { showToast } from "@raycast/api";
import {
  ListUserAuthLogResponse,
  ListUserLogsResponse,
  ListUserNotificationsResponse,
  ListUserStatsResponse,
  ListUsersResponse,
} from "../types/users";
import useHestia from "./hooks/useHestia";
import { ListUserPackagesResponse } from "../types/packages";
import {
  ListWebDomainAccesslogResponse,
  ListWebDomainErrorlogResponse,
  ListWebDomainsResponse,
  ListWebDomainSSLResponse,
} from "../types/web-domains";
import { DOMAIN_LOG_LINES } from "../constants";
import { ListMailDomainsResponse, ListUserIPsResponse } from "../types";
import { ListDatabasesResponse } from "../types/databases";

// USERS
export function getUsers() {
  return useHestia<ListUsersResponse>("v-list-users", "Fetching Users", {
    async onData(data) {
      await showToast({
        title: "SUCCESS",
        message: `Fetched ${Object.keys(data).length} users`,
      });
    },
  });
}
export function getUserStats(user: string) {
  return useHestia<ListUserStatsResponse>("v-list-user-stats", "Fetching User Stats", { body: [user] });
}
export function getUserLogs(user: string) {
  return useHestia<ListUserLogsResponse>("v-list-user-log", "Fetching User Logs", { body: [user] });
}
export function getUserAuthLog(user: string) {
  return useHestia<ListUserAuthLogResponse>("v-list-user-auth-log", "Fetching User Auth Log", { body: [user] });
}
export function getUserNotifications(user: string) {
  return useHestia<ListUserNotificationsResponse>("v-list-user-notifications", "Fetching User Notifications", {
    body: [user],
  });
}

// PACKAGES
export function getUserPackages() {
  return useHestia<ListUserPackagesResponse>("v-list-user-packages", "Fetching User Packages");
}

// WEB DOMAINS
export function getWebDomains(user: string) {
  return useHestia<ListWebDomainsResponse>("v-list-web-domains", "Fetching Web Domains", { body: [user] });
}
export function getWebDomainAccesslog(user: string, domain: string) {
  return useHestia<ListWebDomainAccesslogResponse>("v-list-web-domain-accesslog", "Fetching Web Domain Accesslog", {
    body: [user, domain, DOMAIN_LOG_LINES],
    async onData(data) {
      await showToast({
        title: "SUCCESS",
        message: `Fetched ${data.length} Accesslog lines`,
      });
    },
  });
}
export function getWebDomainErrorlog(user: string, domain: string) {
  return useHestia<ListWebDomainErrorlogResponse>("v-list-web-domain-errorlog", "Fetching Web Domain Error Log", {
    body: [user, domain, DOMAIN_LOG_LINES],
    async onData(data) {
      await showToast({
        title: "SUCCESS",
        message: `Fetched ${data.length} Error Log lines`,
      });
    },
  });
}
export function getWebDomainSSL(user: string, domain: string) {
  return useHestia<ListWebDomainSSLResponse>("v-list-web-domain-ssl", "Fetching Web Domain SSL", {
    body: [user, domain],
  });
}

// IPs
export function getUserIPs(user: string) {
  return useHestia<ListUserIPsResponse>("v-list-user-ips", "Fetching User IPs", { body: [user] });
}

// MAIL
export function getMailDomains(user: string) {
  return useHestia<ListMailDomainsResponse>("v-list-mail-domains", "Fetching Mail Domains", {
    body: [user],
    async onData(data) {
      await showToast({
        title: "SUCCESS",
        message: `Fetched ${Object.keys(data).length} mail domains`,
      });
    },
  });
}

// DATABASES
export function getUserDatabases(user: string) {
  return useHestia<ListDatabasesResponse>("v-list-databases", "Fetching Databases", { body: [user] });
}
