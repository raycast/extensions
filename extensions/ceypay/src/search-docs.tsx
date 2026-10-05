import { Action, ActionPanel, Color, Detail, Icon, List, environment } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useMemo, useState } from "react";
import { BRAND, loadIndex, pageIcon, slugWords } from "./lib/data";
import { mintlifyToMarkdown } from "./lib/mintlify";
import type { DocPage } from "./lib/types";

const ALL_TABS = "__all__";

export default function SearchDocs() {
  const index = useMemo(() => loadIndex(), []);
  const [tab, setTab] = useState(ALL_TABS);

  const tabs = useMemo(() => [...new Set(index.pages.map((page) => page.tab))].sort(), [index]);
  const pages = useMemo(
    () => (tab === ALL_TABS ? index.pages : index.pages.filter((page) => page.tab === tab)),
    [index, tab],
  );

  const sections = useMemo(() => {
    const grouped = new Map<string, DocPage[]>();
    for (const page of pages) {
      const key = page.group || page.tab;
      const bucket = grouped.get(key);
      if (bucket) bucket.push(page);
      else grouped.set(key, [page]);
    }
    return [...grouped.entries()];
  }, [pages]);

  return (
    <List
      searchBarPlaceholder="Search CeyPay docs…"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by section" storeValue onChange={setTab}>
          <List.Dropdown.Item title="All Sections" value={ALL_TABS} />
          {tabs.map((name) => (
            <List.Dropdown.Item key={name} title={name} value={name} />
          ))}
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title="No matching pages"
        description="Try a different term, or widen the section filter."
      />
      {sections.map(([group, items]) => (
        <List.Section key={group} title={group} subtitle={`${items.length}`}>
          {items.map((page) => (
            <PageItem key={page.slug} page={page} />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function PageItem({ page }: { page: DocPage }) {
  const keywords = useMemo(
    () => [...new Set([...slugWords(page.slug), ...slugWords(page.description), ...slugWords(page.tab)])],
    [page],
  );

  return (
    <List.Item
      icon={pageIcon(page)}
      title={page.title}
      subtitle={page.description}
      keywords={keywords}
      accessories={[{ text: `/${page.slug}` }]}
      actions={
        <ActionPanel>
          <Action.Push icon={Icon.Eye} title="Read in Raycast" target={<PageDetail page={page} />} />
          <Action.OpenInBrowser url={page.url} shortcut={{ modifiers: ["cmd"], key: "return" }} />
          <Action.CopyToClipboard
            title="Copy Link"
            content={page.url}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}

/**
 * Every page — changelogs included — comes from Mintlify's `<url>.md` twin,
 * which is MDX and needs converting before Raycast can render it. The changelog
 * RSS feed was the obvious alternative, but its generator drops `<Frame>`
 * children, losing the screenshots from the most recent entries.
 */
function PageDetail({ page }: { page: DocPage }) {
  const { isLoading, data, error } = useFetch<string>(`${page.url}.md`, {
    parseResponse: async (response) => {
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return mintlifyToMarkdown(await response.text(), environment.appearance === "dark");
    },
    keepPreviousData: true,
  });

  const markdown = error
    ? `# ${page.title}\n\n${page.description}\n\n---\n\nCould not load this page (${error.message}).\n\nOpen it in the browser with \`⌘ ↵\`.`
    : (data ?? `# ${page.title}\n\n${page.description}`);

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={page.title}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Section">
            <Detail.Metadata.TagList.Item text={page.tab} color={BRAND} />
            {page.group ? <Detail.Metadata.TagList.Item text={page.group} color={Color.SecondaryText} /> : null}
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="Page" target={page.url} text={`/${page.slug}`} />
          <Detail.Metadata.Label title="Docs" text="docs.ceypay.io" icon={{ source: "icon.png" }} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={page.url} />
          <Action.CopyToClipboard
            title="Copy Link"
            content={page.url}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}
