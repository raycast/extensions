import { showToast, Toast } from "@raycast/api";
import { PaginatedResponse, RawSpace } from "../../models";
import { apiEndpoints, apiFetch, currentApiVersion, errorConnectionMessage } from "../../utils";

// Validate api version and token by checking if data can be fetched without errors
export async function checkApiTokenValidity(): Promise<boolean> {
  try {
    const { url, method } = apiEndpoints.getSpaces({ offset: 0, limit: 1 });
    const response = await apiFetch<PaginatedResponse<RawSpace>>(url, { method: method });

    const apiVersion = response.headers.get("Anytype-Version");
    if (!apiVersion || apiVersion < currentApiVersion) {
      await showToast(
        Toast.Style.Failure,
        "App Update Required",
        `Please update the Anytype app to match the extension's API version ${currentApiVersion}.`,
      );
    } else if (apiVersion > currentApiVersion) {
      await showToast(
        Toast.Style.Failure,
        "Extension Update Required",
        `Please update the extension to match the Anytype app's API version ${apiVersion}.`,
      );
    }
    return true;
  } catch (error) {
    if (error instanceof Error) {
      return error.message == errorConnectionMessage;
    } else {
      console.error("Unknown error:", error);
      return false;
    }
  }
}
