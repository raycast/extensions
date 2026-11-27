import { Action, ActionPanel, type Keyboard } from "@raycast/api";
import { type AdvancedSearchValues } from "../features/search-form";
import { RESULTS_TAB_TITLES, RESULTS_TABS, type PreferredTab, type ResultsTab } from "../features/search-link";

export type SearchHandler = (values: AdvancedSearchValues, resultsTab: ResultsTab) => Promise<boolean>;

const SEARCH_IN_SHORTCUT: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd", "shift"], key: "return" },
  Windows: { modifiers: ["ctrl", "shift"], key: "enter" },
};

export function SearchActions({
  query,
  searchLink,
  preferredTab,
  onSearch,
}: {
  query: string;
  searchLink: string | null;
  preferredTab: PreferredTab;
  onSearch: SearchHandler;
}) {
  return (
    <ActionPanel>
      <Action.SubmitForm
        title={`Search in ${RESULTS_TAB_TITLES[preferredTab]}`}
        onSubmit={(values: AdvancedSearchValues) => onSearch(values, preferredTab)}
      />
      <ActionPanel.Submenu title="Search in" shortcut={SEARCH_IN_SHORTCUT}>
        {RESULTS_TABS.map((resultsTab) => (
          <Action.SubmitForm
            key={resultsTab}
            title={RESULTS_TAB_TITLES[resultsTab]}
            onSubmit={(values: AdvancedSearchValues) => onSearch(values, resultsTab)}
          />
        ))}
      </ActionPanel.Submenu>
      {searchLink !== null ? (
        <>
          <Action.CopyToClipboard title="Copy Query" content={query} />
          <Action.CopyToClipboard title="Copy Search Link" content={searchLink} />
        </>
      ) : null}
    </ActionPanel>
  );
}
