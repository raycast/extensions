import { Action, ActionPanel, List, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import fetch from "node-fetch";
import { HOST, SERVER } from "./constants";

interface RecentDoc {
  id: string;
  title: string;
}

interface QueryResult {
  data: RecentDoc[]
}

async function getRecentDocs(apiKey: string) {
  const res = await fetch(`${SERVER}/v1/docs/recent?api_key=${apiKey}`, {
    headers: {},
  });
  return (await res.json() as QueryResult).data;
}

export default function SearchDocs() {
  const [recentDocs, setRecentDocs] = useState<RecentDoc[]>([]);
  const preferences = getPreferenceValues();

  useEffect(() => {
    async function load() {
      const result = await getRecentDocs(preferences.apiKey);
      setRecentDocs(result);
    }

    load();
  }, []);

  return (
    <List filtering key={"key"}>
      {recentDocs.map((d) => (
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
