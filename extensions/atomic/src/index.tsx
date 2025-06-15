import {
  ActionPanel,
  CopyToClipboardAction,
  Detail,
  getPreferenceValues,
  Icon,
  List,
  OpenInBrowserAction,
  Preferences,
  PushAction,
} from "@raycast/api";
import {
  useServerSearch,
  StoreContext,
  useTitle,
  useResource,
  useString,
  useMarkdown,
  Store,
  urls,
} from "@tomic/react";
import React from "react";

const preferences: Preferences = getPreferenceValues();

const store = new Store({
  serverUrl: preferences.server as unknown as string,
});

/** Fetch all the Properties and Classes - this helps speed up the app. */
store.fetchResource(urls.properties.getAll);
store.fetchResource(urls.classes.getAll);

export default function Command() {
  return (
    <StoreContext.Provider value={store}>
      <Content />
    </StoreContext.Provider>
  );
}

function Content() {
  const [query, setQuery] = React.useState<string>("");
  const { results, loading, error } = useServerSearch(query, {
    include: true,
  });

  const onSearchTextChange = async (text: string) => {
    setQuery(text);
  };

  return (
    <List
      navigationTitle="Atomic Data Search"
      searchBarPlaceholder="Search your Atomic Server..."
      isLoading={loading}
      onSearchTextChange={onSearchTextChange}
    >
      {error && <List.Item title={error.message} />}
      {results && results.map((subject) => <SearchHit subject={subject} key={subject} />)}
    </List>
  );
}

interface SearchHitProps {
  subject: string;
}

function SearchHit({ subject }: SearchHitProps) {
  const resource = useResource(subject);

  const title = useTitle(resource);
  const [description] = useString(resource, urls.properties.description);

  const klass = useResource(resource.getClasses()[0]);
  const klassTitle = useTitle(klass);

  const md = useMarkdown(resource);

  return (
    <List.Item
      key={subject}
      title={title}
      subtitle={description || ""}
      accessoryTitle={klassTitle}
      actions={
        <ActionPanel>
          <PushAction
            icon={Icon.Eye}
            title="Show Details"
            target={
              <Detail
                markdown={md}
                actions={
                  <ActionPanel>
                    <OpenInBrowserAction url={subject} />
                  </ActionPanel>
                }
              />
            }
          />
          <CopyToClipboardAction content={subject} title="Copy URL to clipboard" />
          <OpenInBrowserAction url={subject} />
        </ActionPanel>
      }
    />
  );
}
