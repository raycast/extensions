import { Icon, List, useNavigation } from "@raycast/api";
import { useMemo } from "react";
import { useFederatedSearch } from "../hooks/use-federated-search";
import type { SearchOptions } from "../hooks/use-staged-search";
import type { AcademicSettings } from "../lib/settings";
import {
  mergeAccessIntoSelected,
  targetedQuery,
  targetedRequest,
} from "../lib/staged-results";
import type { ProviderFailure, SearchProvider, WorkResult } from "../types";
import { WorkItem } from "./work-item";
import { ExternalSearches } from "./external-searches";

export function StagedWorkItem({
  work,
  preliminaryResults,
  preliminaryFailures,
  accessProviders,
  accessSettings,
  options,
}: {
  work: WorkResult;
  preliminaryResults: WorkResult[];
  preliminaryFailures: ProviderFailure[];
  accessProviders: SearchProvider[];
  accessSettings: AcademicSettings;
  options: SearchOptions;
}) {
  const { push } = useNavigation();
  return (
    <WorkItem
      work={work}
      suppressAccess
      onFindSources={() =>
        push(
          <SourceLookup
            work={work}
            preliminaryResults={preliminaryResults}
            preliminaryFailures={preliminaryFailures}
            accessProviders={accessProviders}
            accessSettings={accessSettings}
            options={options}
          />,
        )
      }
    />
  );
}

function SourceLookup({
  work,
  preliminaryResults,
  preliminaryFailures,
  accessProviders,
  accessSettings,
  options,
}: {
  work: WorkResult;
  preliminaryResults: WorkResult[];
  preliminaryFailures: ProviderFailure[];
  accessProviders: SearchProvider[];
  accessSettings: AcademicSettings;
  options: SearchOptions;
}) {
  const query = targetedQuery(work);
  const targeted = useFederatedSearch(targetedRequest(work), accessProviders, {
    ...options,
    settings: accessSettings,
  });
  const consolidated = useMemo(
    () =>
      mergeAccessIntoSelected(work, [
        ...preliminaryResults,
        ...targeted.results,
      ]),
    [work, preliminaryResults, targeted.results],
  );
  const failures = uniqueFailures([
    ...preliminaryFailures,
    ...targeted.failures,
  ]);
  const isLoading = targeted.isLoading;
  const sourceCount = new Set(
    consolidated.accessLinks.map((link) => link.source),
  ).size;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      navigationTitle="Available Sources"
      searchBarPlaceholder="Filter found sources…"
    >
      <List.Section
        title="Selected Work"
        subtitle={`${sourceCount} source${sourceCount === 1 ? "" : "s"} found`}
      >
        <WorkItem work={consolidated} />
      </List.Section>
      {!isLoading && consolidated.accessLinks.length === 0 ? (
        <List.Section title="Access">
          <List.Item
            title="No configured source found this work"
            icon={Icon.XMarkCircle}
          />
        </List.Section>
      ) : null}
      {accessSettings.showUnavailableSources && failures.length ? (
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
      <ExternalSearches
        query={query}
        enabledSourceIds={accessSettings.sources}
      />
    </List>
  );
}

function uniqueFailures(failures: ProviderFailure[]): ProviderFailure[] {
  return [
    ...new Map(failures.map((failure) => [failure.provider, failure])).values(),
  ];
}
