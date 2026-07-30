import {
  Action,
  ActionPanel,
  closeMainWindow,
  getPreferenceValues,
  List,
  open,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { useState } from "react";

const AI_COMPARE_CHROME_EXTENSION_ID = "dkhpgbbhlnmjbkihoeniojpkggkabbbl";

function appendOptionalParam(
  params: URLSearchParams,
  key: string,
  value: string | undefined,
): void {
  const trimmedValue = value?.trim();
  if (trimmedValue) {
    params.set(key, trimmedValue);
  }
}

function buildAiCompareUrl(preferences: Preferences, query: string): string {
  const params = new URLSearchParams();
  params.set("query", query.trim());
  appendOptionalParam(params, "sites", preferences.sites);
  appendOptionalParam(params, "type", preferences.siteType);
  if (preferences.openclawMode) {
    params.set("openclaw", "1");
  }

  return `chrome-extension://${AI_COMPARE_CHROME_EXTENSION_ID}/iframe/iframe.html?${params.toString()}`;
}

async function openAiCompare(query: string): Promise<boolean | void> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Enter a query first",
    });
    return false;
  }

  try {
    const preferences = getPreferenceValues<Preferences>();
    const url = buildAiCompareUrl(preferences, trimmedQuery);
    await open(url, "Google Chrome");
    await closeMainWindow({ clearRootSearch: true });
    await showHUD(`Opened AI Compare: ${trimmedQuery}`);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not open AI Compare",
      message: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

export default function Command() {
  const [query, setQuery] = useState("");
  const trimmedQuery = query.trim();

  return (
    <List
      filtering={false}
      searchBarPlaceholder="Enter a question or keyword"
      searchText={query}
      throttle={false}
      onSearchTextChange={setQuery}
    >
      <List.Item
        id="search"
        title={trimmedQuery ? `Search "${trimmedQuery}"` : "Enter a query"}
        subtitle="Press Enter to open AI Compare"
        actions={
          <ActionPanel>
            <Action
              title="Search with AI Compare"
              onAction={() => openAiCompare(query)}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
