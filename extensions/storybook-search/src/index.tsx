import { ActionPanel, Action, List, Detail, getPreferenceValues, openExtensionPreferences } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useMemo } from "react";
import { IndexData, Preferences, StoriesData, Story } from "./types";
import urlJoin from "url-join";

const Search = () => {
  const preferences = getPreferenceValues<Preferences>();

  // Load Storybook's index file https://storybook.js.org/docs/react/sharing/storybook-composition#with-feature-flags
  const {
    data: index,
    isLoading: isLoadingIndex,
    error: indexError,
  } = useFetch<IndexData>(urlJoin(preferences.baseUrl, "index.json"), {
    onError: () => undefined, // prevent default toast
  });
  const {
    data: stories,
    isLoading: isLoadingStories,
    error: storiesError,
  } = useFetch<StoriesData>(urlJoin(preferences.baseUrl, "stories.json"), {
    onError: () => undefined, // prevent default toast
  });

  const storiesToShow = useMemo(() => toStoriesToShow({ index, stories, preferences }), [index, stories, preferences]);

  if (storiesError && indexError)
    return (
      <Detail
        markdown={`Error loading data from Storybook server.\n\nMake sure stories.json or index.json is served from \`${preferences.baseUrl}\`.`}
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );

  return (
    <List isLoading={isLoadingStories || isLoadingIndex} searchBarPlaceholder="Search components...">
      {storiesToShow.map((story) => (
        <SearchListItem key={story.id} story={story} baseUrl={preferences.baseUrl} />
      ))}
    </List>
  );
};

const toStoriesToShow = ({
  index,
  stories,
  preferences,
}: {
  index?: IndexData;
  stories?: StoriesData;
  preferences: Preferences;
}): Story[] => {
  let nameFilterRegExp: RegExp;
  try {
    nameFilterRegExp = new RegExp(preferences.nameFilterRegExp ?? "");
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
        </ActionPanel>
      }
    />
  );
};

export default Search;
