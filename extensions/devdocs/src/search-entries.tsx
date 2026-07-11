import { Action, ActionPanel, getPreferenceValues, Icon, List, LaunchProps } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import Fuse, { type IFuseOptions } from "fuse.js";
import React from "react";
import { Dispatch, SetStateAction, useMemo, useState } from "react";
import { getEntryId, getSelectedEntryId } from "./entry-selection";
import { Entry, Index, Preferences } from "./types";

function useFuse<U>(
  items: U[] | undefined,
  options: IFuseOptions<U>,
  limit: number,
): [U[], Dispatch<SetStateAction<string>>] {
  const [query, setQuery] = useState("");
  const fuse = useMemo(() => {
    return new Fuse(items || [], options);
  }, [items, options]);

  const results = useMemo(() => {
    if (!query) return (items || []).slice(0, limit);
    return fuse.search(query, { limit: limit }).map((result) => result.item);
  }, [fuse, items, limit, query]);

  return [results, setQuery];
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

export default function LaunchFn(props: LaunchProps<{ arguments: { slug: string } }>) {
  return <SearchEntries slug={props.arguments.slug} />;
}

export function SearchEntries({ slug }: { slug: string }) {
  const { data: index, isLoading } = useFetch<Index>(`https://devdocs.io/docs/${slug}/index.json`);
  const [results, setQuery] = useFuse(index?.entries, { keys: ["name", "type"] }, 500);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null | undefined>();
  const firstResultId = getSelectedEntryId(results);

  return (
    <List
      filtering={false}
      isLoading={isLoading}
      onSearchTextChange={(text) => {
        setSelectedEntryId(undefined);
        setQuery(text);
      }}
      onSelectionChange={setSelectedEntryId}
      navigationTitle={`Search Entries: ${formatSlugVersion(slug)}`}
      searchBarPlaceholder={`Search ${formatSlugVersion(slug)} entries...`}
      selectedItemId={selectedEntryId ?? firstResultId}
    >
      {results.map((entry) => (
        <EntryItem entry={entry} key={getEntryId(entry)} slug={slug} />
      ))}
    </List>
  );
}

function EntryItem({ entry, slug }: { entry: Entry; slug: string }) {
  const openActions = renderOpenInActions(slug, entry);

  return (
    <List.Item
      id={getEntryId(entry)}
      title={entry.name}
      icon={Icon.Document}
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
