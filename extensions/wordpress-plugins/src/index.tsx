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
  info: {
    page: number;
    pages: number;
    results: number;
  };
  plugins: [] | Plugin[];
}

const rootUrl =
  "https://api.wordpress.org/plugins/info/1.2/?action=query_plugins&request[fields][banners]=1&request[fields][versions]=1";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const url = `${rootUrl}&request[search]=${searchText}`;
  const {
    data: plugins,
    isLoading,
    pagination,
  } = useFetch<PluginResult, Plugin[], Plugin[]>((options) => url + `&request[page]=${options.page + 1}`, {
    mapResult(result) {
      return {
        data: result.plugins,
        hasMore: result.info.results !== 0 && result.info.page !== result.info.pages,
      };
    },
    initialData: [],
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
      pagination={pagination}
    >
      {!plugins.length && !searchText ? (
        <List.EmptyView title="No plugins found." />
      ) : (
        plugins.map((plugin) => {
          return (
            <List.Item
              key={plugin.slug}
              icon={getPluginIcon(plugin.icons)}
              title={decode(plugin.name)}
              accessories={[{ text: parseAuthorNameFromUrl(plugin.author) }]}
              actions={
                <ActionPanel>
                  <Action.Push title="Show Details" target={<PluginDetails data={plugin} />} icon={Icon.Tag} />
                  <Action.OpenInBrowser
                    url={`${plugin.download_link}`}
                    title={`Download Latest Version - ${plugin.version}`}
                    icon={Icon.Download}
                    shortcut={{ modifiers: ["cmd"], key: "s" }}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
