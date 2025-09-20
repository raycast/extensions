import { Color } from "@raycast/api";
import { COOLIFY_URL } from "./config";
import { DatabaseType, Resource, ResourceDetails } from "./types";
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
