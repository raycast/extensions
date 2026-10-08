import { MobbinMcpClient } from "./mcp-client";
import { getPreferences } from "./preferences";
import { MobbinRestClient } from "./rest-client";
import type { SearchClient } from "./types";

export function createSearchClient(
  preferences = getPreferences(),
): SearchClient {
  if (preferences.authMode === "oauth-mcp") return new MobbinMcpClient();
  return new MobbinRestClient(preferences.apiKey ?? "");
}
