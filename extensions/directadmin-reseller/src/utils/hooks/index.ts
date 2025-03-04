import { showToast, Toast } from "@raycast/api";
import { useJsonDirectAdmin, useLegacyDirectAdmin } from "./use-directadmin";
import {
  GetDatabasesResponse,
  GetResellerIPInformationResponse,
  GetUserConfigResponse,
  GetUserPackageInformationResponse,
} from "../../types";

// LEGACY JSON
export function useGetResellerIPs() {
  return useLegacyDirectAdmin<string[]>("SHOW_RESELLER_IPS", {
    animatedToastMessage: "Fetching Reseller IPs",
    async onData(data) {
      await showToast(Toast.Style.Success, "SUCCESS", `Fetched ${data.length} Reseller IPs`);
    },
  });
}
export function useGetResellerIPInformation(ip: string) {
  return useLegacyDirectAdmin<GetResellerIPInformationResponse>("SHOW_RESELLER_IPS", {
    params: {
      ip,
    },
    animatedToastMessage: "Fetching Reseller IP Information",
    successToastMessage: "Fetched Reseller IP Information",
  });
}
//
export function useGetResellerUserAccounts(reseller: string) {
  return useLegacyDirectAdmin<string[]>("SHOW_USERS", {
    params: {
      reseller,
    },
    animatedToastMessage: "Fetching Users",
    async onData(data) {
      await showToast(Toast.Style.Success, "SUCCESS", `Fetched ${data.length} Users`);
    },
  });
}
//
export function useGetUserPackages() {
  return useLegacyDirectAdmin<string[]>("PACKAGES_USER", {
    animatedToastMessage: "Fetching User Packages",
    async onData(data) {
      await showToast(Toast.Style.Success, "SUCCESS", `Fetched ${data.length} Packages`);
    },
  });
}
export function useGetUserPackageInformation(packageName: string) {
  return useLegacyDirectAdmin<GetUserPackageInformationResponse>("PACKAGES_USER", {
    params: { package: packageName },
    animatedToastMessage: "Fetching User Package Information",
    successToastMessage: "Fetched User Package Information",
  });
}
// DOMAINS
export function useGetDomains() {
  return useLegacyDirectAdmin<string[]>("SHOW_DOMAINS", {
    animatedToastMessage: "Fetching Domains",
    async onData(data) {
      await showToast(Toast.Style.Success, `Fetched ${data.length} Domains`);
    },
  });
}

// NEW JSON
//
export function useGetUserConfig(user: string) {
  return useJsonDirectAdmin<GetUserConfigResponse>(`users/${user}/config`, {
    animatedToastMessage: "Fetching User Config",
    successToastMessage: "Fetched User Config",
  });
}
// db
export function useGetDatabases(userToImpersonate: string) {
  return useJsonDirectAdmin<GetDatabasesResponse>("db-show/databases", {
    animatedToastMessage: "Fetching Databases",
    userToImpersonate,
    async onData(data) {
      await showToast(Toast.Style.Success, `Fetched ${data.length} Databases`);
    },
  });
}
