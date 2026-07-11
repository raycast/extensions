import { Action, ActionPanel, Color, Detail, Icon, List, Toast, showToast, Keyboard } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  LoadedReleaseNotes,
  loadReleaseNoteArticle,
  loadReleaseNotes,
  officialReleaseNotesUrl,
  releaseNoteCategories,
} from "./release-notes";
import { SalesforceReleaseNote, SalesforceReleaseNoteArticle } from "./types";

type Filter = "all" | "changes" | string;

function markdownForNote(note: SalesforceReleaseNote, isPreview: boolean): string {
  const badges = [
    isPreview ? "Preview release" : "Latest release",
    note.isReleaseUpdate ? "Release Update" : undefined,
    note.isRetirement ? "Retirement / deprecation" : undefined,
  ].filter(Boolean);
  return `# ${note.title}

- **Release:** ${note.releaseTitle}
- **Category:** ${note.category}
- **Section:** ${note.section}
- **Status:** ${badges.join(" · ")}

This entry comes from the official Salesforce release notes. Open it to read availability, edition, rollout, and implementation details.`;
}

function ReleaseNotesError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <Detail
      markdown={`# Unable to load Salesforce release notes\n\n${error.message}\n\nAn internet connection is required the first time. After a successful refresh, the most recent index remains available from the local cache.`}
      actions={
        <ActionPanel>
          <Action title="Retry" icon={Icon.ArrowClockwise} onAction={onRetry} />
          <Action.OpenInBrowser title="Open Official Release Notes" icon={Icon.Book} url={officialReleaseNotesUrl()} />
        </ActionPanel>
      }
    />
  );
}

export default function SearchReleaseNotes() {
  const [loaded, setLoaded] = useState<LoadedReleaseNotes>();
  const [filter, setFilter] = useState<Filter>("all");
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<Error>();
  const [selectedId, setSelectedId] = useState<string>();
  const [articles, setArticles] = useState<Record<string, SalesforceReleaseNoteArticle>>({});
  const [articleErrors, setArticleErrors] = useState<Record<string, string>>({});
  const [loadingArticleId, setLoadingArticleId] = useState<string>();

  const refresh = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(undefined);
    try {
      const next = await loadReleaseNotes(forceRefresh);
      setLoaded(next);
      if (next.source === "stale-cache") {
        await showToast({
          style: Toast.Style.Failure,
          title: "Showing cached release notes",
          message: "Salesforce Help could not be refreshed.",
        });
      } else if (forceRefresh) {
        await showToast({ style: Toast.Style.Success, title: "Release notes refreshed" });
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught : new Error(String(caught)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh(false);
  }, [refresh]);

  const categories = useMemo(() => releaseNoteCategories(loaded?.feed.notes ?? []), [loaded]);
  const notes = useMemo(() => {
    const all = loaded?.feed.notes ?? [];
    if (filter === "all") return all;
    if (filter === "changes") return all.filter((note) => note.isReleaseUpdate || note.isRetirement);
    return all.filter((note) => note.category === filter);
  }, [filter, loaded]);

  const loadArticle = useCallback(
    async (note: SalesforceReleaseNote, forceRefresh = false) => {
      if (!forceRefresh && articles[note.id]) return;
      setLoadingArticleId(note.id);
      setArticleErrors((current) => {
        const next = { ...current };
        delete next[note.id];
        return next;
      });
      try {
        const article = await loadReleaseNoteArticle(note, forceRefresh);
        setArticles((current) => ({ ...current, [note.id]: article }));
        if (forceRefresh) await showToast({ style: Toast.Style.Success, title: "Release note refreshed" });
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : String(caught);
        setArticleErrors((current) => ({ ...current, [note.id]: message }));
      } finally {
        setLoadingArticleId((current) => (current === note.id ? undefined : current));
      }
    },
    [articles],
  );

  useEffect(() => {
    const note = notes.find((candidate) => candidate.id === selectedId);
    if (note) void loadArticle(note);
  }, [loadArticle, notes, selectedId]);

  if (error && !loaded) return <ReleaseNotesError error={error} onRetry={() => void refresh(true)} />;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      filtering={{ keepSectionOrder: true }}
      selectedItemId={selectedId}
      onSelectionChange={(id) => setSelectedId(id ?? undefined)}
      searchBarPlaceholder="Search Salesforce release notes…"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter Release Notes" value={filter} onChange={setFilter}>
          <List.Dropdown.Item title="All Release Notes" value="all" icon={Icon.List} />
          <List.Dropdown.Item title="Release Updates & Retirements" value="changes" icon={Icon.Warning} />
          <List.Dropdown.Section title="Categories">
            {categories.map((category) => (
              <List.Dropdown.Item key={category} title={category} value={category} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      <List.Section
        title={
          loaded
            ? `${loaded.feed.releaseTitle}${loaded.feed.isPreview ? " Preview" : ""}${loaded.source === "stale-cache" ? " · Cached" : ""}`
            : "Release Notes"
        }
        subtitle={loaded ? `${notes.length.toLocaleString()} searchable notes` : undefined}
      >
        {notes.map((note) => (
          <List.Item
            id={note.id}
            key={note.id}
            icon={{
              source: note.isRetirement ? Icon.Warning : note.isReleaseUpdate ? Icon.Clock : Icon.Document,
              tintColor: note.isRetirement ? Color.Red : note.isReleaseUpdate ? Color.Orange : Color.Blue,
            }}
            title={note.title}
            keywords={[note.category, note.section, note.releaseTitle, note.isReleaseUpdate ? "release update" : ""]}
            accessories={[
              ...(note.isReleaseUpdate ? [{ tag: { value: "Release Update", color: Color.Orange } }] : []),
              ...(note.isRetirement ? [{ tag: { value: "Retirement", color: Color.Red } }] : []),
            ]}
            detail={
              <List.Item.Detail
                isLoading={loadingArticleId === note.id}
                markdown={
                  articles[note.id]?.markdown ??
                  (articleErrors[note.id]
                    ? `${markdownForNote(note, loaded?.feed.isPreview ?? false)}\n\n---\n\nUnable to load the article body: ${articleErrors[note.id]}`
                    : `${markdownForNote(note, loaded?.feed.isPreview ?? false)}\n\n---\n\nLoading the full release note…`)
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open Release Note" icon={Icon.Book} url={note.url} />
                <Action.CopyToClipboard title="Copy Release Note Link" content={note.url} />
                <Action.CopyToClipboard title="Copy Release Note Title" content={note.title} />
                <Action
                  title="Reload Release Note Body"
                  icon={Icon.Document}
                  onAction={() => void loadArticle(note, true)}
                />
                <Action
                  title="Refresh Release Notes"
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={() => void refresh(true)}
                />
                <Action.OpenInBrowser
                  title="Open Complete Release Notes"
                  icon={Icon.Globe}
                  url={officialReleaseNotesUrl(loaded?.feed.releaseVersion)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      {!isLoading && loaded && !notes.length ? (
        <List.EmptyView title="No release notes in this category" icon={Icon.MagnifyingGlass} />
      ) : null}
    </List>
  );
}
