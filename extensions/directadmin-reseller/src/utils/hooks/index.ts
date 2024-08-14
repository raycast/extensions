import { showToast, Toast } from "@raycast/api";
import { useJsonDirectAdmin, useLegacyDirectAdmin } from "./use-directadmin";
import { GetUserConfigResponse, GetUserPackageInformationResponse } from "../../types";

// LEGACY JSON
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

// NEW JSON
export function useGetUserConfig(user: string) {
  return useJsonDirectAdmin<GetUserConfigResponse>(`users/${user}/config`, {
    animatedToastMessage: "Fetching User Config",
    successToastMessage: "Fetched User Config",
  });
}
