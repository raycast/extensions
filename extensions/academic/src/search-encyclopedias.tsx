import { useMemo, useState } from "react";
import {
  Action,
  ActionPanel,
  Icon,
  List,
  launchCommand,
  LaunchType,
} from "@raycast/api";
import { StagedWorkItem } from "./components/staged-work-item";
import { useAcademicSettings } from "./hooks/use-academic-settings";
import { useStagedSearch } from "./hooks/use-staged-search";
import { ENCYCLOPEDIA_PROVIDERS } from "./providers/encyclopedias";
import {
  SearchModeDropdown,
  type SearchMode,
} from "./components/search-mode-dropdown";

export default function Command() {
  return <EncyclopediaSearch />;
}

export function EncyclopediaSearch({
  onModeChange,
}: {
  onModeChange?: (mode: SearchMode) => void;
}) {
  const [query, setQuery] = useState("");
  const { settings, isLoading: settingsLoading } = useAcademicSettings();
  const providers = useMemo(
    () =>
      ENCYCLOPEDIA_PROVIDERS.filter((provider) =>
        settings.encyclopediaSources.includes(provider.id),
      ),
    [settings.encyclopediaSources.join(",")],
  );
  const staged = useStagedSearch(
    query,
    providers,
    {},
    { ...settings, languages: [] },
  );
  const { results, isLoading } = staged.metadata;
  const failures = staged.preliminary.failures;
  return (
    <List
      filtering={false}
      isLoading={isLoading || settingsLoading}
      isShowingDetail={results.length > 0}
      onSearchTextChange={setQuery}
      searchText={query}
      throttle
      navigationTitle="Academic Encyclopedias"
      searchBarPlaceholder="Concept, person, theory or topic…"
      searchBarAccessory={
        onModeChange ? (
          <SearchModeDropdown value="encyclopedia" onChange={onModeChange} />
        ) : undefined
      }
    >
      {!providers.length ? (
        <List.EmptyView
          icon={Icon.Gear}
          title="No encyclopedia source is enabled"
          description="Choose sources in Configure Academic."
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
      ) : null}
      {providers.length && query.trim().length < 2 ? (
        <List.EmptyView
          icon={Icon.Book}
          title="Search academic encyclopedias"
          description="Results are kept separate from books and research papers."
        />
      ) : null}
      {!isLoading && query.trim().length >= 2 && !results.length ? (
        <List.EmptyView
          icon={Icon.XMarkCircle}
          title="No encyclopedia entries found"
        />
      ) : null}
      {results.length ? (
        <List.Section
          title="Encyclopedia Entries"
          subtitle={`${results.length} result${results.length === 1 ? "" : "s"}`}
        >
          {results.map((work) => (
            <StagedWorkItem
              key={work.id}
              work={work}
              preliminaryResults={staged.preliminary.results}
              preliminaryFailures={staged.preliminary.failures}
              accessProviders={staged.accessProviders}
              accessSettings={staged.sourceSettings}
              options={{}}
            />
          ))}
        </List.Section>
      ) : null}
      {settings.showUnavailableSources && failures.length ? (
        <List.Section title="Unavailable Sources">
          {failures.map((failure) => (
            <List.Item
              key={failure.provider}
              title={failure.provider}
              subtitle={failure.message}
              icon={Icon.ExclamationMark}
            />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}
