import { Action, ActionPanel, getPreferenceValues, Icon, List, LaunchProps } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import Fuse from "fuse.js";
import { Dispatch, SetStateAction, useMemo, useState } from "react";
import { Entry, Index, Preferences } from "./types";

function useFuse<U>(
  items: U[] | undefined,
  options: Fuse.IFuseOptions<U>,
  limit: number,
): [U[], Dispatch<SetStateAction<string>>] {
  const [query, setQuery] = useState("");
  const fuse = useMemo(() => {
    return new Fuse(items || [], options);
  }, [items]);

  if (!query) return [(items || []).slice(0, limit), setQuery];
  const results = fuse.search(query, { limit: limit });
  return [results.map((result) => result.item), setQuery];
}

function formatSlugVersion(slug: string) {
  return slug.replace("~", " ");
}

function openInBrowserAction(slug: string, entry: Entry) {
  return <Action.OpenInBrowser url={`https://devdocs.io/${slug}/${entry.path}`} />;
}

function openInAppAction(slug: string, entry: Entry) {
  return (
    <Action.Open
      icon="devdocs.png"
      title="Open in DevDocs"
      target={`https://devdocs.io/${slug}/${entry.path}`}
      application="DevDocs"
    />
  );
}

function renderOpenInActions(slug: string, entry: Entry) {
  const preferences = getPreferenceValues<Preferences>();
  const browserAction = openInBrowserAction(slug, entry);
  const appAction = openInAppAction(slug, entry);

  if (preferences.primaryOpenInAction == "browser") {
    return (
      <>
        {browserAction}
        {appAction}
      </>
    );
  } else if (preferences.primaryOpenInAction == "app") {
    return (
      <>
        {appAction}
        {browserAction}
      </>
    );
  }
}

export default function LaunchFn(props: LaunchProps<{ arguments: { slug: string } }>): JSX.Element {
  return <SearchEntries slug={props.arguments.slug} />;
}

export function SearchEntries({ slug }: { slug: string }): JSX.Element {
  const { data: index, isLoading } = useFetch<Index>(`https://devdocs.io/docs/${slug}/index.json`);
  const [results, setQuery] = useFuse(index?.entries, { keys: ["name", "type"] }, 500);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={(text) => {
        setQuery(text);
      }}
      navigationTitle={`Search Entries: ${formatSlugVersion(slug)}`}
      searchBarPlaceholder={`Search ${formatSlugVersion(slug)} entries...`}
    >
      {results.map((entry) => (
        <EntryItem entry={entry} key={entry.name + entry.path + entry.type} slug={slug} />
      ))}
    </List>
  );
}

function EntryItem({ entry, slug }: { entry: Entry; slug: string }) {
  const openActions = renderOpenInActions(slug, entry);

  return (
    <List.Item
      title={entry.name}
      icon={Icon.Document}
      key={entry.name + entry.path}
      accessories={[
        {
          tag: entry.type,
        },
      ]}
      keywords={[entry.type].concat(entry.name.split("."))}
      actions={<ActionPanel>{openActions}</ActionPanel>}
    />
  );
}
