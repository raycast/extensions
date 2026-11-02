import { getPreferenceValues } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { getAuthentication, tinyfish } from "../auth";
import { searchTinyFish } from "../tinyfish";
import { searchToolResult, type SearchToolResult } from "../tool-results";
import { parseSearchToolInput, type SearchToolInput } from "../tool-input";

async function tool(input: SearchToolInput): Promise<SearchToolResult> {
  const preferences = getPreferenceValues<Preferences>();
  const request = parseSearchToolInput(input);
  const response = await searchTinyFish({
    ...request,
    location: request.location ?? preferences.location,
    language: request.language ?? preferences.language,
    authentication: await getAuthentication(),
    signal: AbortSignal.timeout(60000),
  });
  return searchToolResult(response.results, request.page ?? 0);
}

export default withAccessToken(tinyfish)(tool);
