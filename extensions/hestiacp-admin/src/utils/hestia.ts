import { showToast } from "@raycast/api";
import { AddUserRequest, ListUserAuthLogResponse, ListUserLogsResponse, ListUserNotificationsResponse, ListUserStatsResponse, ListUsersResponse } from "../types/users";
import useHestia from "./hooks/useHestia";
import { ListUserPackagesResponse } from "../types/packages";

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
// export function addUser(newUser: AddUserRequest) {
//     const body = [
//         newUser.user,
//         newUser.password,
//         newUser.email,
//         newUser.package,
//         newUser.name
//     ]
//     return useHestia<Record<string, never>>("v-add-user", "Adding User", { body, execute: false });
// }

// PACKAGES
export function getUserPackages() {
    return useHestia<ListUserPackagesResponse>("v-list-user-packages", "Fetching User Packages");
}