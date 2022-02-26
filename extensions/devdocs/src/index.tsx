import {
  ActionPanel,
  ActionPanelItem,
  environment,
  Icon,
  ImageLike,
  List,
  OpenInBrowserAction,
  popToRoot,
  PushAction,
  showHUD,
  showToast,
  ToastStyle,
} from "@raycast/api";
import { existsSync, mkdirSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import Fuse from "fuse.js";
import fetch from "node-fetch";
import open from "open";
import { resolve } from "path";
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";
import { URL } from "url";
import { Doc, Entry } from "./types";
import { useVisitedDocs } from "./useVisitedDocs";

export const DEVDOCS_BASE_URL = "https://devdocs.io";
if (!existsSync(environment.supportPath)) {
  mkdirSync(environment.supportPath, { recursive: true });
}

export function faviconUrl(size: number, url: string): string {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?sz=${size}&domain=${domain}`;
  } catch (err) {
    return Icon.Globe;
  }
}

interface FetchResult<T> {
  data?: T;
  isLoading: boolean;
}

export function useFetchWithCache<T>(url: string, cacheFilename: string): FetchResult<T> {
  const cachePath = resolve(environment.supportPath, cacheFilename);
  const [state, setState] = useState<{ data?: T; isLoading: boolean }>({ isLoading: true });

  useEffect(() => {
    async function fetchWithCache() {
      // Load from Cache
      if (existsSync(cachePath)) {
        const text = await readFile(cachePath).then((buffer) => buffer.toString());
        await setState({ data: JSON.parse(text.toString()), isLoading: true });
      }

      // Refresh Cache
      try {
        const data = await fetch(url).then((res) => res.json());
        await setState({ data: data as T, isLoading: false });
        await writeFile(cachePath, JSON.stringify(data));
      } catch (error) {
        console.error(error);
        showToast(ToastStyle.Failure, "Could not refresh cache!", "Please Check your connexion");
      }
    }
    fetchWithCache();
  }, [url]);

  return state;
}

export default function DocList(): JSX.Element {
  const { data, isLoading } = useFetchWithCache<Doc[]>(`${DEVDOCS_BASE_URL}/docs/docs.json`, "index.json");
  const { docs: visitedDocs, visitDoc } = useVisitedDocs();

  return (
    <List isLoading={(!data && !data) || isLoading}>
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

function EntryList(props: { doc: Doc; icon: ImageLike }) {
  const { doc, icon } = props;
  const { data, isLoading } = useFetchWithCache<{ entries: Entry[] }>(
    `${DEVDOCS_BASE_URL}/docs/${doc.slug}/index.json`,
    `${doc.slug}.json`
  );
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
          <OpenInBrowserAction url={`${DEVDOCS_BASE_URL}/${doc.slug}/${entry.path}`} onOpen={() => popToRoot()} />
          <OpenInDevdocsAction url={`${DEVDOCS_BASE_URL}/${doc.slug}/${entry.path}`} onOpen={() => popToRoot()} />
        </ActionPanel>
      }
    />
  );
}

function OpenInDevdocsAction(props: { url: string; onOpen?: () => void }) {
  return (
    <ActionPanelItem
      title="Open in Devdocs"
      icon="devdocs.png"
      onAction={async () => {
        const { exitCode } = await open(props.url, { app: { name: "DevDocs" }, wait: true });
        if (exitCode !== 0) {
          await open("https://github.com/dteoh/devdocs-macos");
          showHUD("Devdocs app is not installed!");
        }

        if (props.onOpen) {
          props.onOpen();
        }
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
            <OpenInBrowserAction url={`${DEVDOCS_BASE_URL}/${slug}`} onOpen={() => popToRoot()} />
            <OpenInDevdocsAction url={`${DEVDOCS_BASE_URL}/${slug}`} onOpen={() => popToRoot()} />
            {links?.home ? (
              <OpenInBrowserAction title="Open Project Homepage" url={links.home} onOpen={() => popToRoot()} />
            ) : null}
            {links?.code ? (
              <OpenInBrowserAction title="Open Code Repository" url={links.code} onOpen={() => popToRoot()} />
            ) : null}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
