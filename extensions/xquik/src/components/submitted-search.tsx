import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useState } from "react";

export type SubmittedSearch = {
  draft: string;
  setDraft: (text: string) => void;
  submitted: string;
  isDirty: boolean;
  submit: () => void;
};

export function useSubmittedSearch(initial = ""): SubmittedSearch {
  const [draft, setDraft] = useState(initial);
  const [submitted, setSubmitted] = useState(initial.trim());
  const query = draft.trim();
  return { draft, setDraft, submitted, isDirty: query !== submitted, submit: () => setSubmitted(query) };
}

export function SearchAction({ search }: { search: SubmittedSearch }) {
  return search.isDirty ? <Action title="Search" icon={Icon.MagnifyingGlass} onAction={search.submit} /> : null;
}

export function IdleSearchView({ search }: { search: SubmittedSearch }) {
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
