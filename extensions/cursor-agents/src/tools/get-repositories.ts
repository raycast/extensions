import { Cache } from "@raycast/api";

/**
 * Returns all available repositories that the user has configured in Cursor Agents.
 * This can be used to determine which repository the user might be referring to.
 */
export default async function tool() {
  const cache = new Cache();
  const repositoriesData = cache.get("repositories");

  if (!repositoriesData) {
    return "No repositories have been configured yet. User needs to add repositories first through the Cursor Agents extension.";
  }

  return JSON.parse(repositoriesData);
}
