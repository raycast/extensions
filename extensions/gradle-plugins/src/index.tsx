import { ActionPanel, List, Action, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { getGradlePlugins } from "./actions/api";
import { GradlePlugin } from "./models/gradle-plugin";
import PluginDetais from "./plugin-details";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [previousPageLink, setPreviousPageLink] = useState<string | null>(null);
  const [nextPageLink, setNextPageLink] = useState<string | null>(null);
  const [plugins, setPlugins] = useState<GradlePlugin[]>([]);

  useEffect(() => {
    fetchGradlePlugins(searchText, null);
  }, [searchText]);

  const fetchGradlePlugins = async (searchQuery: string | null, url: string | null): Promise<void> => {
    setIsLoading(true);
    setPreviousPageLink(null);
    setNextPageLink(null);
    setPlugins([]);

    const response = await getGradlePlugins(searchQuery, url);

    setPlugins(response.items);
    setPreviousPageLink(response.previousPage);
    setNextPageLink(response.nextPage);
    setIsLoading(false);
  };

  return (
    <List
      searchBarPlaceholder="Search plugin"
      filtering={false}
      throttle={true}
      onSearchTextChange={setSearchText}
      isShowingDetail={!isLoading && plugins.length !== 0}
      isLoading={isLoading}
    >
      {plugins.map((plugin) => (
        <List.Item
          key={plugin.name}
          icon={Icon.Plug}
          title={plugin.name}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Link title="Name" target={plugin.link} text={plugin.name} />
                  <List.Item.Detail.Metadata.Label title="Description" text={plugin.description} />
                  <List.Item.Detail.Metadata.Label title="Latest Version" text={plugin.latestVersion} />
                  <List.Item.Detail.Metadata.Label title="Release Date" text={plugin.releaseDate} />
                  <List.Item.Detail.Metadata.TagList title="Tags">
                    {plugin.tags.map((tag) => (
                      <List.Item.Detail.Metadata.TagList.Item key={tag} text={tag} />
                    ))}
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.Separator />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.Push title="Show Details" target={<PluginDetais url={plugin.link} />} />
            </ActionPanel>
          }
        />
      ))}
      {previousPageLink && (
        <List.Item
          key="previous"
          icon={Icon.ArrowLeft}
          title="Previous Page"
          actions={
            <ActionPanel>
              <Action title="Previous Page" onAction={() => fetchGradlePlugins(null, previousPageLink)} />
            </ActionPanel>
          }
        />
      )}
      {nextPageLink && (
        <List.Item
          key="next"
          icon={Icon.ArrowRight}
          title="Next Page"
          actions={
            <ActionPanel>
              <Action title="Next Page" onAction={() => fetchGradlePlugins(null, nextPageLink)} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
