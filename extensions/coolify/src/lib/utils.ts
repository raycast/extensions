import { Color } from "@raycast/api";
import { COOLIFY_URL } from "./config";
import { DatabaseType, ErrorResult, Resource, ResourceDetails } from "./types";
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

export function getResourceTypeEndpoint(type: ResourceDetails["type"]) {
  switch (type) {
    // We only explicitly check for DBs instead of application,service in case more types are added in the future
    case DatabaseType.Clickhouse:
    case DatabaseType.DragonFly:
    case DatabaseType.KeyDB:
    case DatabaseType.MariaDB:
    case DatabaseType.MongoDB:
    case DatabaseType.MySQL:
    case DatabaseType.PostgreSQL:
    case DatabaseType.Redis:
      return "database";
    default:
      return type;
  }
}

export async function parseCoolifyResponse<T>(response: Response) {
  if (!response.headers.get("Content-Type")?.includes("application/json")) throw new Error(response.statusText);
  const result = await response.json();
  if (!response.ok) {
    const err = result as ErrorResult;
    throw new Error(err.errors ? Object.values(err.errors)[0][0] : err.message);
  }
  return result as T;
}
