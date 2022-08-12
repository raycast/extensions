import { Action, ActionPanel, Color, getPreferenceValues, Icon, List } from "@raycast/api";
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
        throw new Error(`${response.statusText} - ${response.status}`);
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
    return (
      <List>
        <List.EmptyView title="Check your Email and API Key" description={error.message} />
      </List>
    );
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
            icon="upstash-icon.png"
            accessories={[
              replicas === "Global"
                ? {
                    text: replicas,
                    icon: {
                      source: Icon.Globe,
                      tintColor: Color.Green,
                    },
                  }
                : {
                    text: replicas,
                  },
              {
                text: `TLS`,
                tooltip: database.tls ? "Enabled" : "Disabled",
                icon: {
                  source: database.tls ? Icon.Check : Icon.Multiply,
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
