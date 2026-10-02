import { Action, ActionPanel, Detail, Icon, List, environment } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { formatEntryDate, formatEntryDateLong, parseChangelog, sortEntries } from "./lib/changelog";
import { BRAND, loadIndex } from "./lib/data";
import type { ChangelogEntry, DocPage } from "./lib/types";

const ALL_SOURCES = "__all__";

export default function Changelog() {
  const index = useMemo(() => loadIndex(), []);
  const pages = useMemo(() => index.pages.filter((page) => page.tab === "Changelog"), [index]);
  const [source, setSource] = useState(ALL_SOURCES);

  const { entries, isLoading, error } = useChangelog(pages);
  const visible = useMemo(
    () => (source === ALL_SOURCES ? entries : entries.filter((entry) => entry.source === source)),
    [entries, source],
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search by title…"
      searchBarAccessory={
        pages.length > 1 ? (
          <List.Dropdown tooltip="Filter by changelog" storeValue onChange={setSource}>
            <List.Dropdown.Item title="All Updates" value={ALL_SOURCES} />
            {pages.map((page) => (
              <List.Dropdown.Item key={page.slug} title={page.title} value={page.title} />
            ))}
          </List.Dropdown>
        ) : null
      }
    >
      <List.EmptyView
        icon={error ? Icon.Warning : Icon.Clock}
        title={error ? "Could not load the changelog" : "No matching updates"}
        description={error ? error.message : "Try a different term."}
      />
      {visible.map((entry) => (
        <EntryItem key={entry.id} entry={entry} />
      ))}
    </List>
  );
}

/**
 * Each changelog is a separate document, so all of them are fetched in one hook
 * and merged — a hook per page would break the rules of hooks if the index ever
 * gained or lost a changelog.
 */
function useChangelog(pages: DocPage[]) {
  const preferDark = environment.appearance === "dark";

  const { data, isLoading, error } = useCachedPromise(
    async (targets: DocPage[], dark: boolean) => {
      const documents = await Promise.all(
        targets.map(async (page) => {
          const response = await fetch(`${page.url}.md`);
          if (!response.ok) throw new Error(`${page.title}: ${response.status} ${response.statusText}`);
          return parseChangelog(await response.text(), page, dark);
        }),
      );
      return sortEntries(documents.flat());
    },
    [pages, preferDark],
    { initialData: [] as ChangelogEntry[], keepPreviousData: true },
  );

  return { entries: data ?? [], isLoading, error };
}

function EntryItem({ entry }: { entry: ChangelogEntry }) {
  return (
    <List.Item
      icon={{ source: Icon.Dot, tintColor: BRAND }}
      title={entry.title}
      keywords={[...entry.tags, entry.source, entry.date ?? ""]}
      accessories={[
        ...entry.tags.slice(0, 2).map((tag) => ({ tag: { value: tag, color: BRAND } })),
        { text: formatEntryDate(entry.date) },
      ]}
      actions={
        <ActionPanel>
          <Action.Push icon={Icon.Eye} title="Show Details" target={<EntryDetail entry={entry} />} />
          <Action.OpenInBrowser url={entry.url} shortcut={{ modifiers: ["cmd"], key: "return" }} />
          <Action.CopyToClipboard
            title="Copy Link"
            content={entry.url}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}

function EntryDetail({ entry }: { entry: ChangelogEntry }) {
  const markdown = `# ${entry.title}\n\n${entry.markdown}`;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={entry.title}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Released" text={formatEntryDateLong(entry.date) || "—"} />
          {entry.tags.length > 0 ? (
            <Detail.Metadata.TagList title="Tags">
              {entry.tags.map((tag) => (
                <Detail.Metadata.TagList.Item key={tag} text={tag} color={BRAND} />
              ))}
            </Detail.Metadata.TagList>
          ) : null}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Changelog" text={entry.source} />
          <Detail.Metadata.Link title="Permalink" target={entry.url} text="Open on docs" />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={entry.url} />
          <Action.CopyToClipboard
            title="Copy Link"
            content={entry.url}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}
