import {
  ActionPanel,
  ActionPanelItem,
  getLocalStorageItem,
  Icon,
  ImageLike,
  List,
  OpenInBrowserAction,
  PushAction,
  setLocalStorageItem,
  showToast,
  ToastStyle,
} from "@raycast/api";
import open from "open";
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";
import { Doc, Entry, Index } from "./types";
import Fuse from "fuse.js";
import { useVisitedDocs } from "./useVisitedDocs";
import fetch from "node-fetch";
import { URL } from "url";

export const DEVDOCS_BASE_URL = "https://devdocs.io";

export function faviconUrl(size: number, url: string): string {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?sz=${size}&domain=${domain}`;
  } catch (err) {
    return Icon.Globe;
  }
}

export async function fetchDocIndex(): Promise<Doc[]> {
  try {
    const response = await fetch(`${DEVDOCS_BASE_URL}/docs/docs.json`);
    const json = await response.json();
    return json as Doc[];
  } catch (error) {
    console.error(error);
    showToast(ToastStyle.Animated, "Could not refresh doc", "Please check your connexion.");
    return Promise.resolve([]);
  }
}

export async function fetchEntries(slug: string): Promise<Entry[]> {
  try {
    const response = await fetch(`${DEVDOCS_BASE_URL}/docs/${slug}/index.json`);
    const json = await response.json();
    return (json as Index).entries;
  } catch (error) {
    console.error(error);
    showToast(ToastStyle.Failure, "Could not load doc. Please check your connexion.");
    return Promise.resolve([]);
  }
}

export default function DocList(): JSX.Element {
  const [state, setState] = useState<{ docs?: Doc[]; isLoading: boolean }>({ isLoading: true });
  const { docs: visitedDocs, visitDoc, isLoading } = useVisitedDocs();

  useEffect(() => {
    let shouldUpdate = true;
    async function refreshIndex() {
      await getLocalStorageItem("index").then((content) => {
        content && shouldUpdate ? setState({ docs: JSON.parse(content as string), isLoading: false }) : null;
      });
      await fetchDocIndex().then((docs) => {
        if (shouldUpdate) {
          setState({ docs, isLoading: false });
          setLocalStorageItem("index", JSON.stringify(docs));
        }
      });
      return () => {
        shouldUpdate = false;
      };
    }
    refreshIndex();
  }, []);

  useEffect(() => {
    fetchDocIndex().then((docs) => {
      setState({ docs: docs, isLoading: false });
      setLocalStorageItem("index", JSON.stringify(docs));
    });
  }, []);

  return (
    <List isLoading={state.isLoading || isLoading}>
      <List.Section title="Last Visited">
        {visitedDocs?.map((doc) => (
          <DocItem key={doc.slug} doc={doc} onVisit={() => visitDoc(doc)} />
        ))}
      </List.Section>
      <List.Section title="All">
        {state.docs?.map((doc) => (
          <DocItem key={doc.slug} doc={doc} onVisit={() => visitDoc(doc)} />
        ))}
      </List.Section>
    </List>
  );
}

function useFuse<U>(items: U[], options: Fuse.IFuseOptions<U>, limit: number): [U[], Dispatch<SetStateAction<string>>] {
  const [query, setQuery] = useState("");
  const fuse = useMemo(() => {
    return new Fuse(items, options);
  }, [items]);

  if (!query) return [items.slice(0, limit), setQuery];
  const results = fuse.search(query, { limit: limit });
  return [results.map((result) => result.item), setQuery];
}

function EntryList(props: { doc: Doc; icon: ImageLike }) {
  const { doc, icon } = props;
  const [entries, setEntries] = useState<Entry[]>([]);
  const [results, setQuery] = useFuse(entries, { keys: ["name", "type"] }, 500);

  useEffect(() => {
    let shouldUpdate = true;
    async function refreshEntries() {
      await getLocalStorageItem(doc.slug).then((content) => {
        content && shouldUpdate ? setEntries(JSON.parse(content as string)) : null;
      });
      await fetchEntries(doc.slug).then((entries) => {
        if (shouldUpdate) {
          setEntries(entries);
          setLocalStorageItem(doc.slug, JSON.stringify(entries));
        }
      });
    }
    refreshEntries();
    return () => {
      shouldUpdate = false;
    };
  }, []);

  return (
    <List
      isLoading={entries.length == 0}
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
