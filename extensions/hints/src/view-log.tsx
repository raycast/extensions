import { Action, ActionPanel, List, getPreferenceValues, Icon, Toast, showToast, Color } from "@raycast/api";
import { spawn } from "child_process";
import fetch from "node-fetch";
import { useState, useEffect } from "react";

interface Preferences {
  api_token: string;
}

interface Log {
  id: string;
  status: string;
  source: string;
  destination: string;
  integrationId: string;
  text: string;
  createdAt: any;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();

  const [pages, setPages] = useState([]);
  const [searchText, setSearchText] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  async function search() {
    const toast = await showToast({ title: "Talking with Hints...", style: "ANIMATED" as any });

    const response = await fetch(
      `https://europe-west3-slipbox-6f705.cloudfunctions.net/getNotesByUserIdFromHitsFlow?api_key=${preferences.api_token}`
    );
    const data: any = await response.json();
    data.sort((a: any, b: any) => b.createdAt._seconds - a.createdAt._seconds);
    setPages(data);
    toast.style = Toast.Style.Success;
    toast.title = "History log updated";
  }

  useEffect(() => {
    const searchFlows = async () => {
      setIsLoading(true);

      await search();
      setIsLoading(false);
    };
    searchFlows();
  }, [searchText]);

  return (
    <List filtering isLoading={isLoading} searchBarPlaceholder="Search pages" throttle={true}>
      <List.Section title="Sended request to Hints AI Assistant" subtitle={`${pages?.length}`}>
        {pages?.map((log: Log) => {
          const date = new Date(log.createdAt._seconds * 1000).toDateString();
          return (
            <List.Item
              key={`search-result-page-${log.id}`}
              title={log.text}
              subtitle={`${log.source} → ${log.destination}`}
              keywords={[log.text, log.status, log.source, log.destination]}
              accessories={[
                {
                  icon: {
                    source:
                      log.status === "failed"
                        ? Icon.XMarkCircle
                        : log.status === "pending"
                        ? Icon.CircleProgress
                        : Icon.CheckCircle,
                    tintColor:
                      log.status === "failed" ? Color.Red : log.status === "pending" ? Color.Blue : Color.Green,
                  },
                  text: `${date}`,
                },
              ]}
              actions={
                <ActionPanel title="Actions">
                  <Action.CopyToClipboard title="Copy Message to Clipboard" content={log.text} />
                  <Action.OpenInBrowser
                    title="Open Integration Settings"
                    url={`https://i.hints.so/integrations/output/${log.destination}/${log.integrationId}`}
                    shortcut={{ modifiers: ["cmd"], key: "enter" }}
                  />
                  <Action.OpenInBrowser
                    title="Open Created Item"
                    url="hints.so"
                    shortcut={{ modifiers: ["cmd"], key: "." }}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
