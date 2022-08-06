import {ActionPanel, List, Action, showToast, Toast, getPreferenceValues, Icon, Color} from "@raycast/api";
import {useCachedPromise} from "@raycast/utils";
import fetch from "node-fetch";
import {ICluster, IPreferences} from "./types";
import {apiUrl, consoleUrl} from "./utils";

export default function Clusters() {
  const {isLoading, error, data} = useCachedPromise(
    async () => {
      const preferences: IPreferences = getPreferenceValues();

      const response = await fetch(`${apiUrl}/kafka/clusters`, {
        method: "GET",
        headers: {
          Authorization: `Basic ${btoa(`${preferences.email}:${preferences.apiKey}`)}`,
        },
      });

      if (!response.ok) {
        return [];
      }

      const json = await response.json();
      return json as ICluster[];
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
    <List isLoading={isLoading} searchBarPlaceholder="Filter cluster by title...">
      {data.map((cluster: ICluster) => {
        const url = `${consoleUrl}/redis/${cluster.cluster_id}`;

        return (
          <List.Item
            key={cluster.cluster_id}
            title={cluster.name}
            subtitle={cluster.rest_endpoint}
            icon="upstash-icon.png"
            accessories={[
              {text: cluster.multizone ? "Multi Zone" : "Single Zone"},
            ]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open in Browser" url={url}/>
                <Action.CopyToClipboard title="Copy URL" content={url}/>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
