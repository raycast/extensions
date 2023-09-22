import { ActionPanel, List, Action, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { decode } from "html-entities";
import { getPluginIcon, parseAuthorNameFromUrl } from "./utils";
import { PluginDetails } from "./components/PluginDetails";

export interface Plugin {
  name: string;
  slug: string;
  version: string;
  tested: string;
  last_updated: string;
  active_installs: number;
  versions: Record<string, string>;
  download_link: string;
  banners: Record<"low" | "high", string>;
  short_description: string;
  author: string;
  icons: Record<"2x" | "1x" | "svg" | "default", string>;
}

interface PluginResult {
  plugins: [] | Plugin[];
}

const rootUrl =
  "https://api.wordpress.org/plugins/info/1.2/?action=query_plugins&request[fields][banners]=1&request[fields][versions]=1";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const url = `${rootUrl}&request[search]=${searchText}`;
  const { data, isLoading } = useFetch<PluginResult>(url, {
    keepPreviousData: true,
  });

  return (
    <List
      searchText={searchText}
      throttle={true}
      onSearchTextChange={setSearchText}
      navigationTitle="Search Plugins"
      searchBarPlaceholder="Search for a plugin"
      isLoading={isLoading}
    >
      {!data && !searchText ? (
        <List.EmptyView title="No plugins found." />
      ) : (
        data?.plugins &&
        data.plugins.map((plugin) => {
          return (
            <List.Item
              key={plugin.slug}
              icon={getPluginIcon(plugin.icons)}
              title={decode(plugin.name)}
              accessories={[{ text: parseAuthorNameFromUrl(plugin.author) }]}
              actions={
                <ActionPanel>
                  <Action.Push title="Show Details" target={<PluginDetails data={plugin} />} icon={Icon.Tag} />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
