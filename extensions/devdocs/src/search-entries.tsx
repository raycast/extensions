import { Action, ActionPanel, Icon, List, LaunchProps } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import Fuse from "fuse.js";
import { Dispatch, SetStateAction, useMemo, useState } from "react";
import { Entry, Index } from "./types";

function useFuse<U>(
  items: U[] | undefined,
  options: Fuse.IFuseOptions<U>,
  limit: number
): [U[], Dispatch<SetStateAction<string>>] {
  const [query, setQuery] = useState("");
  const fuse = useMemo(() => {
    return new Fuse(items || [], options);
  }, [items]);

  if (!query) return [(items || []).slice(0, limit), setQuery];
  const results = fuse.search(query, { limit: limit });
  return [results.map((result) => result.item), setQuery];
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
    >
      {results.map((entry) => (
        <EntryItem entry={entry} key={entry.name + entry.path + entry.type} slug={slug} />
      ))}
    </List>
  );
}

function EntryItem({ entry, slug }: { entry: Entry; slug: string }) {
  return (
    <List.Item
      title={entry.name}
      icon={Icon.Dot}
      key={entry.name + entry.path}
      keywords={[entry.type].concat(entry.name.split("."))}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={`https://devdocs.io/${slug}/${entry.path}`} />
          <Action.Open
            icon="devdocs.png"
            title="Open in DevDocs"
            target={`https://devdocs.io/${slug}/${entry.path}`}
            application="DevDocs"
          />
        </ActionPanel>
      }
    />
  );
}
