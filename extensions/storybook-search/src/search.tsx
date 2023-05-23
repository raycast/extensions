import { ActionPanel, Action, List, Detail } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useMemo } from "react";
import { IndexData, StoriesData, Story, Config } from "./types";
import EditConfig from "./edit-config";
import urlJoin from "url-join";

const Search = ({ config }: { config: Config }) => {
  // Load Storybook's index file https://storybook.js.org/docs/react/configure/sidebar-and-urls#story-indexers
  const {
    data: index,
    isLoading: isLoadingIndex,
    error: indexError,
  } = useFetch<IndexData>(urlJoin(config.baseUrl, "index.json"), {
    onError: () => undefined, // prevent default toast
  });
  const {
    data: stories,
    isLoading: isLoadingStories,
    error: storiesError,
  } = useFetch<StoriesData>(urlJoin(config.baseUrl, "stories.json"), {
    onError: () => undefined, // prevent default toast
  });

  const storiesToShow = useMemo(() => toStoriesToShow({ index, stories, config }), [index, stories, config]);

  if (storiesError && indexError)
    return (
      <Detail
        markdown={`Error loading data from Storybook server.\n\nMake sure stories.json or index.json is served from ${config.baseUrl}.`}
        actions={
          <ActionPanel>
            <EditConfigAction />
          </ActionPanel>
        }
      />
    );

  return (
    <List
      isLoading={isLoadingStories || isLoadingIndex}
      searchBarPlaceholder="Search components..."
      actions={
        <ActionPanel>
          <EditConfigAction />
        </ActionPanel>
      }
    >
      {storiesToShow.map((story) => (
        <SearchListItem key={story.id} story={story} baseUrl={config.baseUrl} />
      ))}
    </List>
  );
};

const toStoriesToShow = ({
  index,
  stories,
  config,
}: {
  index?: IndexData;
  stories?: StoriesData;
  config: Config;
}): Story[] => {
  let nameFilterRegExp: RegExp;
  try {
    nameFilterRegExp = new RegExp(config.nameFilterRegExp ?? "");
  } catch {
    return [];
  }

  // filter by name and title
  const filter = (stories: [string, Story][]) =>
    stories.filter(([_, s]) => nameFilterRegExp.test(s.name)).map(([_, s]) => s);

  // index.json is the preferred source of truth
  if (index) return filter(Object.entries(index.entries));
  if (stories) return filter(Object.entries(stories.stories));

  return [];
};

const SearchListItem = ({ story, baseUrl }: { story: Story; baseUrl: string }) => {
  const title = `${story.title} - ${story.name}`;
  return (
    <List.Item
      title={title}
      keywords={[story.title, story.id, story.name]}
      actions={
        <ActionPanel title={title}>
          <ActionPanel.Section>
            <Action.OpenInBrowser url={new URL(`?path=/story/${story.id}`, baseUrl).href} title="Open in Storybook" />
            <Action.CopyToClipboard content={story.importPath} title="Copy Import Path" />
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
