import { showToast, Toast } from "@raycast/api";
import { API_TOKEN, CPANEL_URL, CPANEL_USERNAME } from "./constants";
import { ErrorResponse, SuccessResponse } from "./types";

type callUAPIOptions = {
  animatedToastTitle: string;
  successToastTitle: string;
  throwError?: boolean;
};
export async function callUAPI<T>(
  module: string,
  functionName: string,
  params?: Record<string, string | number>,
  options: callUAPIOptions = { animatedToastTitle: "Processing", successToastTitle: "Processed", throwError: false },
) {
  const toast = await showToast(Toast.Style.Animated, options.animatedToastTitle);
  try {
    const API_URL = new URL(`execute/${module}/${functionName}`, CPANEL_URL);
    if (params) Object.entries(params).forEach(([key, val]) => API_URL.searchParams.append(key, val.toString()));

    const response = await fetch(API_URL, {
      headers: {
        Authorization: `cpanel ${CPANEL_USERNAME}:${API_TOKEN}`,
      },
    });
    const result: ErrorResponse | SuccessResponse<T> = await response.json();
    if (!result.status) throw new Error(result.errors.join());
    if (result.data === 0) throw new Error("Something went wrong");
    toast.style = Toast.Style.Success;
    toast.title = options.successToastTitle;
    return result.data;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "cPanel Error";
    toast.message = `${error}`;
    if (options.throwError) throw error;
  }
}

// API
export const revokeAPIToken = (name: string) =>
  callUAPI<1>(
    "Tokens",
    "revoke",
    { name },
    {
      animatedToastTitle: "Revoking Api Token",
      successToastTitle: "Revoked Api Token",
    },
  );

// DNS
export const deleteDNSZoneRecord = (serial: string, zone: string, remove: number) =>
  callUAPI<{ new_serial: string }>(
    "DNS",
    "mass_edit_zone",
    { serial, zone, remove },
    {
      animatedToastTitle: "Removing Dns Record",
      successToastTitle: "Removed Dns Record",
    },
  );
