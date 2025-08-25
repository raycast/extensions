import { JSX, useState } from "react";
import { List } from "@raycast/api";
import { useSearch } from "./hooks";
import EpicListItem from "./components/EpicListItem";
import StoryListItem from "./components/StoryListItem";

export default function SearchStories(): JSX.Element {
  const [query, setQuery] = useState("");
  const { data, isLoading, mutate, error } = useSearch(query);

  return (
    <List
      onSearchTextChange={setQuery}
      isLoading={!!query && isLoading && !error}
      searchBarPlaceholder="Search stories or epics"
    >
      {error && <List.EmptyView title="Error" description={error.message} />}

      <List.Section title="Epics">
        {data?.epics.data.map((epic) => (
          <EpicListItem key={epic.id} epic={epic} />
        ))}
      </List.Section>

      <List.Section title="Stories">
        {data?.stories.data.map((story) => (
          <StoryListItem key={story.id} story={story} mutate={mutate} />
        ))}
      </List.Section>
    </List>
  );
}
