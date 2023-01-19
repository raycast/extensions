import { Action, ActionPanel, environment, Icon, List } from "@raycast/api";
import { getFavicon, useFetch } from "@raycast/utils";
import { existsSync, mkdirSync } from "fs";
import Fuse from "fuse.js";
import { Dispatch, SetStateAction, useMemo, useState } from "react";
import { Doc, Entry, Index } from "./types";

export const DEVDOCS_BASE_URL = "https://devdocs.io";
if (!existsSync(environment.supportPath)) {
  mkdirSync(environment.supportPath, { recursive: true });
}

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

export default function EntryList(): JSX.Element {
  const { data: docs, isLoading: docLoading } = useFetch<Record<string, Doc>>(`${DEVDOCS_BASE_URL}/docs/docs.json`, {
    parseResponse: async (response) => {
      const payload = (await response.json()) as Doc[];
      return Object.fromEntries(payload.map((doc) => [doc.slug, doc]));
    },
  });

  const [selectedDoc, setSelectedDoc] = useState<Doc | undefined>();

  const { data: index, isLoading: entriesLoading } = useFetch<Index>(
    `${DEVDOCS_BASE_URL}/docs/${selectedDoc?.slug}/index.json`,
    { execute: typeof selectedDoc !== "undefined" }
  );
  const [results, setQuery] = useFuse(index?.entries, { keys: ["name", "type"] }, 500);

  return (
    <List
      searchBarAccessory={
        docs && (
          <List.Dropdown
            tooltip="Documentation"
            onChange={(slug) => setSelectedDoc(docs[slug])}
            storeValue
            defaultValue="react"
          >
            {Object.entries(docs).map(([key, doc]) => (
              <List.Dropdown.Item
                icon={doc.links?.home ? getFavicon(doc.links.home, { fallback: Icon.Book }) : Icon.Book}
                key={key}
                title={doc.version ? `${doc.name} ${doc.version}` : doc.name}
                value={key}
              />
            ))}
          </List.Dropdown>
        )
      }
      isLoading={docLoading || entriesLoading}
      onSearchTextChange={(text) => {
        setQuery(text);
      }}
    >
      {selectedDoc &&
        results.map((entry) => (
          <EntryItem entry={entry} key={entry.name + entry.path + entry.type} doc={selectedDoc} />
        ))}
    </List>
  );
}

function EntryItem(props: { entry: Entry; doc: Doc }) {
  const { entry, doc } = props;
  const homeIcon = doc.links?.home ? getFavicon(doc.links?.home, { fallback: Icon.Book }) : Icon.Book;
  const CodeIcon = doc.links?.code ? getFavicon(doc.links?.code, { fallback: Icon.Code }) : Icon.Code;
  return (
    <List.Item
      title={entry.name}
      icon={doc.links?.home ? getFavicon(doc.links.home, { fallback: Icon.Dot }) : Icon.Dot}
      key={entry.name + entry.path}
      accessoryTitle={entry.type}
      keywords={[entry.type].concat(entry.name.split("."))}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser url={`${DEVDOCS_BASE_URL}/${doc.slug}/${entry.path}`} />
            <Action.Open
              icon="devdocs.png"
              title="Open in DevDocs"
              target={`${DEVDOCS_BASE_URL}/${doc.slug}/${entry.path}`}
              application="DevDocs"
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            {doc.links?.home && <Action.OpenInBrowser icon={homeIcon} title="Open Project Home" url={doc.links.home} />}
            {doc.links?.code && (
              <Action.OpenInBrowser icon={CodeIcon} title="Open Project Repository" url={doc.links.code} />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
