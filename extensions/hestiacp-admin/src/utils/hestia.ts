import { showToast } from "@raycast/api";
import { ListUserAuthLogResponse, ListUserLogsResponse, ListUserNotificationsResponse, ListUserStatsResponse, ListUsersResponse } from "../types/users";
import useHestia from "./hooks/useHestia";
import { ListUserPackagesResponse } from "../types/packages";
import { ListWebDomainsResponse } from "../types/web-domains";

// USERS
export function getUsers() {
    return useHestia<ListUsersResponse>("v-list-users", "Fetching Users", {
        async onData(data) {
            showToast({
                title: "SUCCESS",
                message: `Fetched ${Object.keys(data).length} users`
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
    return useHestia<ListUserNotificationsResponse>("v-list-user-notifications", "Fetching User Notifications", { body: [user] });
}

// PACKAGES
export function getUserPackages() {
    return useHestia<ListUserPackagesResponse>("v-list-user-packages", "Fetching User Packages");
}

// WEB DOMAINS
export function getWebDomains(user: string) {
    return useHestia<ListWebDomainsResponse>("v-list-web-domains", "Fetching Web Domains", { body: [user] });
}