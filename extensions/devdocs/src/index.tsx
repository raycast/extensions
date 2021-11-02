import {
  ActionPanel,
  ActionPanelItem, Icon,
  ImageLike,
  List,
  OpenInBrowserAction,
  PushAction,
  showToast,
  ToastStyle
} from "@raycast/api";
import Fuse from "fuse.js";
import fetch from "node-fetch";
import open from "open";
import { Dispatch, SetStateAction, useMemo, useState } from "react";
import useSWR from "swr";
import { URL } from "url";
import { Doc, Entry } from "./types";
import { useVisitedDocs } from "./useVisitedDocs";

export const DEVDOCS_BASE_URL = "https://devdocs.io";

export function faviconUrl(size: number, url: string): string {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?sz=${size}&domain=${domain}`;
  } catch (err) {
    return Icon.Globe;
  }
}

interface FetchResult<T> {
  data: T | undefined;
  isLoading: boolean;
}

function fetcher<T>(path: string) {
  return fetch(path).then((res) => res.json()) as Promise<T>
}

export function useFetch<T>(path: string): FetchResult<T> {
  const { data, error } = useSWR<T, Error>(path, fetcher);
  if (error) {
    showToast(ToastStyle.Failure, "An error occurred!", "Please check your connexion.")
  }

  return { data, isLoading: !error && !data };
}

export default function DocList(): JSX.Element {
  const { data, isLoading } = useFetch<Doc[]>(`${DEVDOCS_BASE_URL}/docs/docs.json`);
  const { docs: visitedDocs, visitDoc } = useVisitedDocs();

  return (
    <List isLoading={!data && !data || isLoading}>
      <List.Section title="Last Visited">
        {visitedDocs?.map((doc) => (
          <DocItem key={doc.slug} doc={doc} onVisit={() => visitDoc(doc)} />
        ))}
      </List.Section>
      <List.Section title="All">
        {data?.map((doc) => (
          <DocItem key={doc.slug} doc={doc} onVisit={() => visitDoc(doc)} />
        ))}
      </List.Section>
    </List>
  );
}

function useFuse<U>(items: U[] | undefined, options: Fuse.IFuseOptions<U>, limit: number): [U[], Dispatch<SetStateAction<string>>] {
  const [query, setQuery] = useState("");
  const fuse = useMemo(() => {
    return new Fuse(items || [], options);
  }, [items]);

  if (!query) return [(items || []).slice(0, limit), setQuery];
  const results = fuse.search(query, { limit: limit });
  return [results.map((result) => result.item), setQuery];
}

function EntryList(props: { doc: Doc; icon: ImageLike }) {
  const { doc, icon } = props;
  const { data, isLoading } = useFetch<{entries: Entry[]}>(`${DEVDOCS_BASE_URL}/docs/${doc.slug}/index.json`);
  const [results, setQuery] = useFuse(data?.entries, { keys: ["name", "type"] }, 500);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={(text) => {
        setQuery(text);
      }}
    >
      {results.map((entry) => (
        <EntryItem entry={entry} icon={icon} key={entry.name + entry.path + entry.type} doc={doc} />
      ))}
    </List>
  );
}

function EntryItem(props: { entry: Entry; doc: Doc; icon: ImageLike }) {
  const { entry, doc, icon } = props;
  return (
    <List.Item
      title={entry.name}
      icon={icon}
      key={entry.name + entry.path}
      accessoryTitle={entry.type}
      keywords={[entry.type].concat(entry.name.split("."))}
      actions={
        <ActionPanel>
          <OpenInBrowserAction url={`${DEVDOCS_BASE_URL}/${doc.slug}/${entry.path}`} />
          <OpenInDevdocsAction url={`${DEVDOCS_BASE_URL}/${doc.slug}/${entry.path}`} />
        </ActionPanel>
      }
    />
  );
}

function OpenInDevdocsAction(props: { url: string }) {
  return (
    <ActionPanelItem
      title="Open in Devdocs"
      icon="devdocs.png"
      onAction={() => {
        open(props.url, { app: { name: "DevDocs" } });
      }}
    />
  );
}

function DocItem(props: { doc: Doc; onVisit: () => void }) {
  const { doc, onVisit } = props;
  const { name, slug, links, version, release } = doc;
  const icon = links?.home ? faviconUrl(64, links.home) : Icon.Dot;
  return (
    <List.Item
      key={slug}
      title={name}
      icon={icon}
      subtitle={version}
      keywords={[release]}
      accessoryTitle={release}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <PushAction
              title="Browse Entries"
              icon={Icon.ArrowRight}
              target={<EntryList doc={doc} icon={icon} />}
              onPush={onVisit}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <OpenInBrowserAction url={`${DEVDOCS_BASE_URL}/${slug}`} />
            <OpenInDevdocsAction url={`${DEVDOCS_BASE_URL}/${slug}`} />
            {links?.home ? <OpenInBrowserAction title="Open Project Homepage" url={links.home} /> : null}
            {links?.code ? <OpenInBrowserAction title="Open Code Repository" url={links.code} /> : null}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
