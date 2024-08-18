import { Color } from "@raycast/api";
import { COOLIFY_URL } from "./config";
import { Resource, ResourceDetails } from "./types";

export function isValidCoolifyUrl() {
    try {
        new URL("api/v1/", COOLIFY_URL);
        return true;
    } catch (error) {
        return false;
    }
}

export function getResourceColor(resource: Resource | ResourceDetails) {
    return resource.status.startsWith("running:") ? Color.Green : Color.Red;
}