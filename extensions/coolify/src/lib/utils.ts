import { Color } from "@raycast/api";
import { COOLIFY_URL } from "./config";
import { Resource, ResourceDetails } from "./types";
import { showFailureToast } from "@raycast/utils";

export function generateCoolifyUrl(url = "") {
  return new URL(url, COOLIFY_URL);
}

export function isValidCoolifyUrl() {
  try {
    generateCoolifyUrl();
    return true;
  } catch (error) {
    showFailureToast(error);
    return false;
  }
}

export function getResourceColor(resource: Resource | ResourceDetails) {
  return resource.status.startsWith("running:") ? Color.Green : Color.Red;
}

export function capitalizeFirstLetter(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
