import {
  ActionPanel,
  getLocalStorageItem,
  getPreferenceValues,
  Icon,
  List,
  removeLocalStorageItem,
  setLocalStorageItem,
  showToast,
  ToastStyle,
} from "@raycast/api";
import { useState, useEffect } from "react";
import fetch from "node-fetch";

import { Preferences } from "./preferences";
import { Alert, AlertListItem, fetchAlerts } from "./alerts";

const preferences: Preferences = getPreferenceValues();

export default function SavedSearchesList() {
  const [state, setState] = useState<{ alerts: Alert[]; active: string; savedSearches: SavedSearch[] }>({
    alerts: [],
    active: "",
    savedSearches: [],
  });

  async function selectSearch(query: string) {
    await setLocalStorageItem("saved-search-active-query", query);
    const alerts = await fetchAlerts(query);

    setState((oldState) => ({
      ...oldState,
      alerts: alerts,
      active: query,
    }));
  }

  async function goBackToSavedSearches() {
    await removeLocalStorageItem("saved-search-active-query");
    const savedSearches = await fetchSavedSearches();

    setState((oldState) => ({
      ...oldState,
      active: "",
      savedSearches: savedSearches,
    }));
  }

  async function fetch() {
    const query: string | undefined = await getLocalStorageItem("saved-search-active-query");

    if (query) {
      const alerts = await fetchAlerts(query);

      setState((oldState) => ({
        ...oldState,
        alerts: alerts,
        active: query,
      }));
    } else {
      const savedSearches = await fetchSavedSearches();

      setState((oldState) => ({
        ...oldState,
        savedSearches: savedSearches,
      }));
    }
  }

  useEffect(() => {
    fetch();
  }, []);

  if (state.active !== "") {
    return (
      <List isLoading={state.alerts.length === 0} searchBarPlaceholder="Filter alerts...">
        {state.alerts.map((alert) => (
          <AlertListItem key={alert.id} alert={alert} goBackToSavedSearches={goBackToSavedSearches} />
        ))}
      </List>
    );
  }

  return (
    <List isLoading={state.savedSearches.length === 0} searchBarPlaceholder="Filter saved searches...">
      {state.savedSearches.map((savedSearch) => (
        <SavedSearchesListItem key={savedSearch.id} savedSearch={savedSearch} selectSearch={selectSearch} />
      ))}
    </List>
  );
}

function SavedSearchesListItem(props: { savedSearch: SavedSearch; selectSearch: (query: string) => Promise<void> }) {
  const savedSearch = props.savedSearch;
  const selectSearch = props.selectSearch;

  return (
    <List.Item
      id={savedSearch.id}
      key={savedSearch.id}
      title={savedSearch.query}
      accessoryTitle={savedSearch.name}
      actions={
        <ActionPanel>
          <ActionPanel.Item title="Select" icon={Icon.Pin} onAction={() => selectSearch(savedSearch.query)} />
        </ActionPanel>
      }
    />
  );
}

async function fetchSavedSearches(): Promise<SavedSearch[]> {
  try {
    const response = await fetch(`${preferences.apiUrl}/v2/alerts/saved-searches`, {
      headers: {
        Authorization: `GenieKey ${preferences.apiKey}`,
      },
    });

    const json = await response.json();

    if (response.status >= 200 && response.status < 300) {
      if ((json as Record<string, unknown>).data) {
        const savedSearches: SavedSearch[] = [];

        for (const savedSearch of (json as Record<string, unknown>).data as SavedSearchItem[]) {
          const s = await fetchSavedSearch(savedSearch.id);
          savedSearches.push(s);
        }

        console.log(savedSearches);
        return savedSearches;
      }

      return [];
    } else {
      if ((json as Record<string, string>).message) throw new Error((json as Record<string, string>).message);
      throw new Error("An unknown error occurred");
    }
  } catch (error) {
    console.error(error);
    showToast(ToastStyle.Failure, `Could not load alerts: ${error.message}`);
    return Promise.resolve([]);
  }
}

async function fetchSavedSearch(id: string): Promise<SavedSearch> {
  try {
    const response = await fetch(`${preferences.apiUrl}/v2/alerts/saved-searches/${id}`, {
      headers: {
        Authorization: `GenieKey ${preferences.apiKey}`,
      },
    });

    const json = await response.json();

    if (response.status >= 200 && response.status < 300) {
      if ((json as Record<string, unknown>).data) {
        return (json as Record<string, unknown>).data as SavedSearch;
      }

      throw new Error("Could not parse Opsgenie API response");
    } else {
      if ((json as Record<string, string>).message) throw new Error((json as Record<string, string>).message);
      throw new Error("An unknown error occurred");
    }
  } catch (error) {
    throw new Error(error.message);
  }
}

type SavedSearch = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  description: string;
  query: string;
};

type SavedSearchItem = {
  id: string;
  name: string;
};
