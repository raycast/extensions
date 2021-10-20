import {
  ActionPanel,
  ActionPanelItem,
  Color,
  environment,
  Icon,
  List,
  OpenInBrowserAction,
  PushAction,
  render,
  showToast,
  ToastStyle,
} from "@raycast/api";
import open from "open";
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";
import { IndexCache, DEVDOCS_BASE_URL } from "./api";
import { Doc, Entry } from "./types";
import Fuse from "fuse.js";

const cache = new IndexCache(environment.supportPath);

export default function DocList(): JSX.Element {
  const [docs, setDocs] = useState<Doc[]>([]);

  useEffect(() => {
    (async () => {
      const docs = await cache.get();
      setDocs(docs);
    })();
  }, []);

  return (
    <List isLoading={docs.length === 0}>
      {docs.map((doc) => (
        <DocItem key={doc.slug} doc={doc} />
      ))}
    </List>
  );
}

function useFuse<U>(items: U[], options: Fuse.IFuseOptions<U>, limit = 100): [U[], Dispatch<SetStateAction<string>>] {
  const [query, setQuery] = useState("");
  const fuse = useMemo(() => {
    return new Fuse(items, options);
  }, [items]);

  if (!query) return [items.slice(0, limit), setQuery];
  const results = fuse.search(query, { limit: limit });
  return [results.map((result) => result.item), setQuery];
}

function EntryList(props: { doc: Doc }) {
  const { doc } = props;
  const [entries, setEntries] = useState<Entry[]>([]);
  const [results, setQuery] = useFuse(entries, { keys: ["name", "type"] });

  useEffect(() => {
    let shouldUpdate = true;
    async function updateEntries() {
      const entries = await cache.get(doc);
      if (shouldUpdate) setEntries(entries);
    }
    updateEntries();
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
        <EntryItem entry={entry} key={entry.name + entry.path + entry.type} doc={doc} />
      ))}
    </List>
  );
}

function EntryItem(props: { entry: Entry; doc: Doc }) {
  const { entry, doc } = props;
  return (
    <List.Item
      title={entry.name}
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

function DocItem(props: { doc: Doc }) {
  const { doc } = props;
  return (
    <List.Item
      key={doc.slug}
      id={doc.slug}
      title={doc.name}
      subtitle={doc.version}
      keywords={[doc.release]}
      accessoryTitle={doc.release}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <PushAction title="Browse Entries" target={<EntryList doc={doc} />} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <OpenInBrowserAction url={`${DEVDOCS_BASE_URL}/${doc.slug}`} />
            <OpenInDevdocsAction url={`${DEVDOCS_BASE_URL}/${doc.slug}`} />
            <OpenInBrowserAction title="Open Project Homepage" url={doc.links?.home} />
            <OpenInBrowserAction title="Open Code Repository" url={doc.links?.code} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <ClearDocCache doc={doc} />
            <ClearIndexCache />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function ClearIndexCache() {
  return (
    <ActionPanelItem
      title={`Clear Index Cache`}
      icon={{ tintColor: Color.Red, source: Icon.Trash }}
      onAction={() => {
        cache.clear();
        showToast(ToastStyle.Success, "Cache Cleared!");
      }}
    />
  );
}

function ClearDocCache(props: { doc: Doc }) {
  const { doc } = props;
  return (
    <ActionPanelItem
      title={`Clear ${doc.name} Cache`}
      icon={{ tintColor: Color.Red, source: Icon.Trash }}
      onAction={() => {
        cache.clear(doc);
        showToast(ToastStyle.Success, "Cache Cleared!");
      }}
    />
  );
}
