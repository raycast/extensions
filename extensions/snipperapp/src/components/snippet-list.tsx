import { Color, Icon, List } from "@raycast/api";
import { useCachedPromise, useFrecencySorting } from "@raycast/utils";
import { useState } from "react";
import { displayNameFor } from "../lib/language";
import { setLastSnippet } from "../lib/last-used";
import { useLibraryMeta, workspaceOf, type LibraryMeta } from "../lib/meta";
import { getPrefs } from "../lib/preferences";
import { isHelperNotFound, searchSnippets } from "../lib/snipper-helper";
import type { Snippet } from "../lib/types";
import { AppNotInstalled } from "./app-not-installed";
import { SnippetActions } from "./snippet-ui";

function SnippetListItem({
  snippet,
  meta,
  prefs,
  onMutated,
  onUse,
}: {
  snippet: Snippet;
  meta?: LibraryMeta;
  prefs: Preferences;
  onMutated: () => void;
  onUse: () => void;
}) {
  const workspaceId = workspaceOf(snippet, meta);
  const workspaceName = workspaceId ? meta?.workspaceNameById.get(workspaceId) : undefined;
  const languageName = snippet.language ? displayNameFor(snippet.language, meta?.languages) : undefined;
  const firstLine = snippet.content
    .split("\n")
    .find((line) => line.trim().length > 0)
    ?.trim();

  const accessories: List.Item.Accessory[] = [];
  if (snippet.isFavorite)
    accessories.push({ icon: { source: Icon.Star, tintColor: Color.Yellow }, tooltip: "Favorite" });
  if (prefs.showWorkspace && workspaceName) accessories.push({ tag: workspaceName });
  if (prefs.showLanguage && languageName)
    accessories.push({ tag: { value: languageName, color: Color.SecondaryText } });
  if (snippet.hubUrl) accessories.push({ icon: Icon.Globe, tooltip: "Published on the Hub" });

  return (
    <List.Item
      icon={Icon.Code}
      title={snippet.title}
      subtitle={firstLine}
      accessories={accessories}
      actions={
        <SnippetActions
          snippet={snippet}
          languages={meta?.languages}
          workspaceName={workspaceName}
          onMutated={onMutated}
          onUse={onUse}
        />
      }
    />
  );
}

/** The shared local-library list. `sortBy="recent"` skips frecency reordering. */
export function LocalSnippetsView({ sortBy = "frecency" }: { sortBy?: "frecency" | "recent" }) {
  const prefs = getPrefs();
  const meta = useLibraryMeta();
  const [query, setQuery] = useState("");
  const [workspaceId, setWorkspaceId] = useState("all");

  const { data, isLoading, error, revalidate } = useCachedPromise(
    (q: string) => searchSnippets({ query: q || undefined, limit: 100 }),
    [query],
    { keepPreviousData: true },
  );

  const frecency = useFrecencySorting(data ?? [], { key: (snippet) => snippet.id });

  if (isHelperNotFound(error)) return <AppNotInstalled />;

  const useFrecency = sortBy === "frecency" && prefs.enableFrecency;
  const base = useFrecency ? frecency.data : (data ?? []);
  const items =
    workspaceId === "all" ? base : base.filter((snippet) => workspaceOf(snippet, meta.data) === workspaceId);

  function recordUse(snippet: Snippet) {
    if (prefs.enableFrecency) frecency.visitItem(snippet);
    void setLastSnippet({ id: snippet.id, title: snippet.title, content: snippet.content });
  }

  return (
    <List
      isLoading={isLoading || meta.isLoading}
      searchBarPlaceholder="Search your snippets…"
      onSearchTextChange={setQuery}
      throttle
      filtering={false}
      searchBarAccessory={
        meta.data && meta.data.workspaces.length > 1 ? (
          <List.Dropdown tooltip="Workspace" storeValue value={workspaceId} onChange={setWorkspaceId}>
            <List.Dropdown.Item title="All Workspaces" value="all" icon={Icon.Globe} />
            <List.Dropdown.Section title="Workspaces">
              {meta.data.workspaces.map((workspace) => (
                <List.Dropdown.Item
                  key={workspace.id}
                  title={workspace.name}
                  value={workspace.id}
                  icon={Icon.AppWindowGrid2x2}
                />
              ))}
            </List.Dropdown.Section>
          </List.Dropdown>
        ) : undefined
      }
    >
      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title={query ? "No snippets found" : "No snippets yet"}
        description={query ? "Try a different search." : "Create snippets in SnipperApp, then find them here."}
      />
      {items.map((snippet) => (
        <SnippetListItem
          key={snippet.id}
          snippet={snippet}
          meta={meta.data}
          prefs={prefs}
          onMutated={revalidate}
          onUse={() => recordUse(snippet)}
        />
      ))}
    </List>
  );
}
