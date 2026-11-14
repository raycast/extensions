import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { createDeeplink, useLocalStorage } from "@raycast/utils";
import { useEffect, useState } from "react";
import { matchingRecents, withRecent } from "../lib/recents";
import { SHORTCUTS } from "../lib/shortcuts";

export type SearchCommand = "search-posts" | "search-users";

const QUICKLINK_NAMES: Record<SearchCommand, (query: string) => string> = {
  "search-posts": (query) => `Search X for ${query}`,
  "search-users": (query) => `Find X Users Named ${query}`,
};

export type SubmittedSearch = {
  command: SearchCommand;
  draft: string;
  setDraft: (text: string) => void;
  submitted: string;
  isDirty: boolean;
  submit: () => void;
  run: (query: string) => void;
  recents: string[];
  isLoadingRecents: boolean;
  removeRecent: (query: string) => void;
  clearRecents: () => void;
};

export function useSubmittedSearch(command: SearchCommand, initial = ""): SubmittedSearch {
  const [draft, setDraft] = useState(initial);
  const [submitted, setSubmitted] = useState(initial.trim());
  const { value, setValue, isLoading } = useLocalStorage<string[]>(`recent-${command}`, []);
  const recents = value ?? [];
  useEffect(() => {
    if (submitted && !isLoading) setValue(withRecent(recents, submitted));
  }, [submitted, isLoading]);
  const query = draft.trim();
  return {
    command,
    draft,
    setDraft,
    submitted,
    isDirty: query !== submitted,
    submit: () => setSubmitted(query),
    run: (recent) => {
      setDraft(recent);
      setSubmitted(recent);
    },
    recents,
    isLoadingRecents: isLoading,
    removeRecent: (recent) => setValue(recents.filter((item) => item !== recent)),
    clearRecents: () => setValue([]),
  };
}

export function SearchAction({ search }: { search: SubmittedSearch }) {
  return search.isDirty ? <Action title="Search" icon={Icon.MagnifyingGlass} onAction={search.submit} /> : null;
}

export function SaveSearchAction({ command, query }: { command: SearchCommand; query: string }) {
  return (
    <Action.CreateQuicklink
      title="Save as Quicklink"
      shortcut={SHORTCUTS.quicklink}
      quicklink={{ name: QUICKLINK_NAMES[command](query), link: createDeeplink({ command, arguments: { query } }) }}
    />
  );
}

function RecentRow({ search, query }: { search: SubmittedSearch; query: string }) {
  return (
    <List.Item
      title={query}
      icon={Icon.Clock}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action title="Search" icon={Icon.MagnifyingGlass} onAction={() => search.run(query)} />
            <SaveSearchAction command={search.command} query={query} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Remove Recent Search"
              icon={Icon.XMarkCircle}
              style={Action.Style.Destructive}
              shortcut={Keyboard.Shortcut.Common.Remove}
              onAction={() => search.removeRecent(query)}
            />
            <Action
              title="Clear Recent Searches"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={Keyboard.Shortcut.Common.RemoveAll}
              onAction={search.clearRecents}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export function IdleSearchView({ search }: { search: SubmittedSearch }) {
  if (search.recents.length === 0) {
    return (
      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title="Press Enter to Search"
        description="You pay only for the results you get."
        actions={
          <ActionPanel>
            <SearchAction search={search} />
          </ActionPanel>
        }
      />
    );
  }
  const query = search.draft.trim();
  return (
    <>
      {query && (
        <List.Item
          title={query}
          subtitle="Press Enter to Search"
          icon={Icon.MagnifyingGlass}
          actions={
            <ActionPanel>
              <SearchAction search={search} />
            </ActionPanel>
          }
        />
      )}
      <List.Section title="Recent Searches">
        {matchingRecents(search.recents, search.draft).map((recent) => (
          <RecentRow key={recent} search={search} query={recent} />
        ))}
      </List.Section>
    </>
  );
}
