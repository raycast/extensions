import { Action, ActionPanel, List, getPreferenceValues, openCommandPreferences } from "@raycast/api";
import { useEffect, useState } from "react";
import { showFailureToast } from "@raycast/utils";
import fetch from "node-fetch";
import { HOST, SERVER } from "./constants";

interface RecentDoc {
  id: string;
  title: string;
}

interface QueryResult {
  data: RecentDoc[];
}

async function getRecentDocs(apiKey: string) {
  const response = await fetch(`${SERVER}/v1/docs/recent?api_key=${apiKey}`, {
    headers: {},
  });
  if (response.status !== 200) {
    throw new Error("Please make sure your API key is valid.");
  }
  return ((await response.json()) as QueryResult).data;
}

export default function SearchDocs() {
  const [recentDocs, setRecentDocs] = useState<RecentDoc[]>();
  const [errorOccurred, setErrorOccurred] = useState(false);
  const preferences = getPreferenceValues();

  useEffect(() => {
    async function load() {
      try {
        const result = await getRecentDocs(preferences.apiKey);
        setRecentDocs(result);
      } catch (e) {
        setErrorOccurred(true);
        await showFailureToast(e, {
          title: "Could not load recent docs.",
          primaryAction: { title: "Configure Command", onAction: () => openCommandPreferences() },
        });
      }
    }

    load();
  }, []);

  return (
    <List filtering key={"key"} isLoading={recentDocs === undefined && !errorOccurred}>
      {recentDocs?.map((d) => (
        <List.Item
          key={d.id}
          title={d.title}
          id={d.id}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={`${HOST}/document/${d.id}`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
