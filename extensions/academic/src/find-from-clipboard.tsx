import { useEffect, useMemo, useState } from "react";
import {
  Clipboard,
  Icon,
  List,
  getPreferenceValues,
  getSelectedText,
} from "@raycast/api";
import { StagedWorkItem } from "./components/staged-work-item";
import { useAcademicSettings } from "./hooks/use-academic-settings";
import { useStagedSearch } from "./hooks/use-staged-search";
import { getSearchOptions, type ExtensionPreferences } from "./preferences";
import { getEnabledProviders } from "./providers";
import {
  SearchModeDropdown,
  type SearchMode,
} from "./components/search-mode-dropdown";

export default function Command() {
  return <FindSelection />;
}

export function FindSelection({
  onModeChange,
}: {
  onModeChange?: (mode: SearchMode) => void;
}) {
  const [query, setQuery] = useState("");
  const [readingInput, setReadingInput] = useState(true);
  const preferences = getPreferenceValues<ExtensionPreferences>();
  const { settings, isLoading: settingsLoading } = useAcademicSettings();
  const providers = useMemo(
    () => getEnabledProviders(settings.metadataSources),
    [settings.metadataSources.join(",")],
  );
  const options = useMemo(
    () => getSearchOptions(preferences),
    [
      preferences.contactEmail,
      preferences.googleBooksApiKey,
      preferences.semanticScholarApiKey,
      preferences.coreApiKey,
    ],
  );
  useEffect(() => {
    void (async () => {
      let value = "";
      try {
        value = await getSelectedText();
      } catch {
        value = (await Clipboard.readText()) ?? "";
      }
      setQuery(value.replace(/\s+/g, " ").trim().slice(0, 1200));
      setReadingInput(false);
    })();
  }, []);
  const staged = useStagedSearch(query, providers, options, settings);
  const { results, isLoading } = staged.metadata;
  const failures = staged.preliminary.failures;
  return (
    <List
      filtering
      isLoading={readingInput || settingsLoading || isLoading}
      isShowingDetail={results.length > 0}
      navigationTitle="Find Selected Academic Work"
      searchBarPlaceholder="Filter results…"
      searchBarAccessory={
        onModeChange ? (
          <SearchModeDropdown value="find" onChange={onModeChange} />
        ) : undefined
      }
    >
      {!readingInput && query.length < 2 ? (
        <List.EmptyView
          icon={Icon.Clipboard}
          title="No usable selected text or clipboard content"
          description="Copy a title, citation, DOI or ISBN and run this command again."
        />
      ) : null}
      {results.length ? (
        <List.Section
          title="Matches"
          subtitle={`From “${query.slice(0, 80)}${query.length > 80 ? "…" : ""}”`}
        >
          {results.map((work) => (
            <StagedWorkItem
              key={work.id}
              work={work}
              preliminaryResults={staged.preliminary.results}
              preliminaryFailures={staged.preliminary.failures}
              accessProviders={staged.accessProviders}
              accessSettings={staged.sourceSettings}
              options={options}
            />
          ))}
        </List.Section>
      ) : null}
      {!isLoading && query.length >= 2 && !results.length ? (
        <List.EmptyView
          icon={Icon.XMarkCircle}
          title="No bibliographic match found"
        />
      ) : null}
      {settings.showUnavailableSources && failures.length ? (
        <List.Section title="Unavailable Sources">
          {failures.map((failure) => (
            <List.Item
              key={failure.provider}
              title={failure.provider}
              subtitle={failure.message}
            />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}
