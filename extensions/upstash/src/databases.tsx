import { Action, ActionPanel, Color, getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import fetch from "node-fetch";
import { IDatabase, IPreferences } from "./types";
import { apiUrl, consoleUrl } from "./utils";

export default function Databases() {
  const { isLoading, error, data } = useCachedPromise(
    async () => {
      const preferences: IPreferences = getPreferenceValues();

      const response = await fetch(`${apiUrl}/redis/databases`, {
        method: "GET",
        headers: {
          Authorization: `Basic ${btoa(`${preferences.email}:${preferences.apiKey}`)}`,
        },
      });

      if (!response.ok) {
        return [];
      }

      const json = await response.json();
      return json as IDatabase[];
    },
    [],
    {
      initialData: [],
      keepPreviousData: true,
    }
  );

  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Something went wrong",
      message: error.message,
    });
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter database by title...">
      {data.map((database: IDatabase) => {
        const url = `${consoleUrl}/redis/${database.database_id}`;

        let replicas = "Single Zone";
        if (database.region === "global") {
          replicas = "Global";
        } else if (database.multizone) {
          replicas = "Multi Zone";
        }

        return (
          <List.Item
            key={database.database_id}
            title={database.database_name}
            subtitle={database.endpoint}
            quickLook={{
              name: "Redis",
              path: url,
            }}
            icon="upstash-icon.png"
            accessories={[
              { text: replicas },
              {
                text: `TLS`,
                icon: {
                  source: Icon.Check,
                  tintColor: database.tls ? Color.Green : null,
                },
              },
            ]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open in Browser" url={url} />
                <Action.CopyToClipboard title="Copy URL" content={url} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
