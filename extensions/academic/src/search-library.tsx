import { useMemo, useState } from "react";
import {
  Action,
  ActionPanel,
  Icon,
  LaunchType,
  List,
  getPreferenceValues,
  launchCommand,
} from "@raycast/api";
import { StagedWorkItem } from "./components/staged-work-item";
import { useAcademicSettings } from "./hooks/use-academic-settings";
import { useStagedSearch } from "./hooks/use-staged-search";
import { getEnabledProviders } from "./providers";
import { getSearchOptions } from "./preferences";
import type { LaunchProps } from "@raycast/api";
import { AdvancedSearch } from "./advanced-search";
import { EncyclopediaSearch } from "./search-encyclopedias";
import {
  SearchModeDropdown,
  type SearchMode,
} from "./components/search-mode-dropdown";
import { FindSelection } from "./find-from-clipboard";
import { IdentifyPdf } from "./identify-pdf";

export default function Command(
  props: LaunchProps<{ launchContext?: { query?: string } }>,
) {
  const [mode, setMode] = useState<SearchMode>("search");
  if (mode === "advanced") return <AdvancedSearch onModeChange={setMode} />;
  if (mode === "encyclopedia")
    return <EncyclopediaSearch onModeChange={setMode} />;
  if (mode === "find") return <FindSelection onModeChange={setMode} />;
  if (mode === "pdf") return <IdentifyPdf onModeChange={setMode} />;
  return (
    <SimpleSearch
      initialQuery={props.launchContext?.query ?? ""}
      onModeChange={setMode}
    />
  );
}

function SimpleSearch({
  initialQuery,
  onModeChange,
}: {
  initialQuery: string;
  onModeChange: (mode: SearchMode) => void;
}) {
  const [query, setQuery] = useState(initialQuery);
  const preferences = getPreferenceValues<Preferences>();
  const { settings, isLoading: settingsLoading } = useAcademicSettings();
  const providers = useMemo(
    () => getEnabledProviders(settings.metadataSources),
    [settings.metadataSources.join(",")],
  );
  const searchOptions = useMemo(
    () => getSearchOptions(preferences),
    [
      preferences.contactEmail,
      preferences.googleBooksApiKey,
      preferences.semanticScholarApiKey,
      preferences.coreApiKey,
    ],
  );
  const staged = useStagedSearch(query, providers, searchOptions, settings);
  const { results, isLoading, notice } = staged.metadata;
  const failures = staged.preliminary.failures;
  const noProviders =
    providers.length === 0 && settings.localFolders.length === 0;

  return (
    <List
      filtering={false}
      isLoading={isLoading || settingsLoading}
      isShowingDetail={results.length > 0}
      onSearchTextChange={setQuery}
      searchText={query}
      throttle
      navigationTitle="Academic"
      searchBarPlaceholder="Title, author, DOI, ISBN or ISSN…"
      searchBarAccessory={
        <SearchModeDropdown value="search" onChange={onModeChange} />
      }
    >
      {noProviders ? (
        <List.EmptyView
          icon={Icon.Gear}
          title="No source is enabled"
          description="Enable at least one source in the extension preferences."
          actions={
            <ActionPanel>
              <Action
                title="Configure Academic"
                icon={Icon.Gear}
                onAction={() =>
                  launchCommand({
                    name: "configure-academic",
                    type: LaunchType.UserInitiated,
                  })
                }
              />
            </ActionPanel>
          }
        />
      ) : query.trim().length < 2 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search books and scholarly works"
          description="Enter a title, author, DOI, ISBN or ISSN. Results from available sources will be combined."
        />
      ) : !isLoading && results.length === 0 ? (
        <List.EmptyView
          icon={Icon.XMarkCircle}
          title="No results"
          description={
            failures.length
              ? "All enabled sources failed. Check the error entries and try again."
              : "Try a different title or identifier."
          }
        />
      ) : null}

      {results.length ? (
        <List.Section
          title="Works"
          subtitle={`${results.length} consolidated result${results.length === 1 ? "" : "s"}`}
        >
          {results.map((work) => (
            <StagedWorkItem
              key={work.id}
              work={work}
              preliminaryResults={staged.preliminary.results}
              preliminaryFailures={staged.preliminary.failures}
              accessProviders={staged.accessProviders}
              accessSettings={staged.sourceSettings}
              options={searchOptions}
            />
          ))}
        </List.Section>
      ) : null}

      {notice ? (
        <List.Section title="Language Notice">
          <List.Item title={notice} icon={Icon.ExclamationMark} />
        </List.Section>
      ) : null}

      {settings.showUnavailableSources && failures.length ? (
        <List.Section
          title="Unavailable Sources"
          subtitle="Other sources may still have returned results"
        >
          {failures.map((failure) => (
            <List.Item
              key={failure.provider}
              title={failure.provider}
              subtitle={failure.message}
              icon={Icon.ExclamationMark}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title="Copy Error"
                    content={`${failure.provider}: ${failure.message}`}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}
