import { getPreferenceValues, Tool } from "@raycast/api";
import { refreshGameList } from "../lib/game-list";
import { indexAgeDays, isIndexReady } from "../lib/search-index";

const NO_KEY = "Updating the game list needs a Web API Key in the Steam extension preferences.";

const webApiKey = () => getPreferenceValues<Preferences>().token?.trim();

function lastUpdated() {
  if (!isIndexReady()) return "Never";
  const days = Math.floor(indexAgeDays());
  if (days === 0) return "Today";
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export const confirmation: Tool.Confirmation<void> = async () => {
  if (!webApiKey()) throw new Error(NO_KEY);
  return { message: "Update the Steam game list now?", info: [{ name: "Last updated", value: lastUpdated() }] };
};

/**
 * Download the Steam game list again, so games released since the last update can be found by title.
 * It also re-reads the user's library, so games they just bought get an added date.
 * Only use this when the user asks to update or refresh the game list.
 */
export default async function refreshGameListTool() {
  const key = webApiKey();
  if (!key) throw new Error(NO_KEY);
  const started = Date.now();
  const added = await refreshGameList(key);
  return {
    updated: true,
    seconds: Math.round((Date.now() - started) / 1000),
    newOnSteam: added.apps,
    newInLibrary: added.owned,
  };
}
