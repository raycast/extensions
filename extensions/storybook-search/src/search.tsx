import { ActionPanel, Action, List, Detail } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useMemo } from "react";
import { IndexData, StoriesData, Component, Config } from "./types";
import EditConfig from "./edit-config";

const Search = ({ config: { baseUrl } }: { config: Config }) => {
  // Load Storybook's index file https://storybook.js.org/docs/react/configure/sidebar-and-urls#story-indexers
  const {
    data: index,
    isLoading: isLoadingIndex,
    error: indexError,
  } = useFetch<IndexData>(new URL("index.json", baseUrl).href);
  const {
    data: stories,
    isLoading: isLoadingStories,
    error: storiesError,
  } = useFetch<StoriesData>(new URL("stories.json", baseUrl).href);

  const componentsToShow = useMemo(() => toComponentsToShow(index, stories), [index, stories]);

  if (storiesError && indexError)
    return (
      <Detail
        markdown={`Error loading data from Storybook server.\n\nMake sure stories.json or index.json is served from ${baseUrl}.`}
        actions={
          <ActionPanel>
            <EditConfigAction />
          </ActionPanel>
        }
      />
    );

  return (
    <List isLoading={isLoadingStories || isLoadingIndex} searchBarPlaceholder="Search components...">
      {componentsToShow.map((component) => (
        <SearchListItem key={component.id} component={component} baseUrl={baseUrl} />
      ))}
    </List>
  );
};

const toComponentsToShow = (indexData?: IndexData, storiesData?: StoriesData): Component[] => {
  const filter = (components: [string, Component][]) =>
    components.filter(([_, c]) => c.name === "Docs").map(([_, c]) => c);

  // index.json is the preferred source of truth
  if (indexData) return filter(Object.entries(indexData.entries));
  if (storiesData) return filter(Object.entries(storiesData.stories));

  return [];
};

const SearchListItem = ({ component, baseUrl }: { component: Component; baseUrl: string }) => {
  return (
    <List.Item
      title={component.title}
      keywords={[component.title, component.id]}
      actions={
        <ActionPanel title={component.title}>
          <ActionPanel.Section>
            <Action.OpenInBrowser
              url={new URL(`?path=/story/${component.id}`, baseUrl).href}
              title="Open in Storybook"
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <EditConfigAction />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};

const EditConfigAction = () => <Action.Push target={<EditConfig />} title="Edit Config" />;

export default Search;
