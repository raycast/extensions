import { useState, useEffect, useMemo } from "react";
import { Action, ActionPanel, Icon, List, openCommandPreferences } from "@raycast/api";
import { getFavicon, showFailureToast, useCachedPromise } from "@raycast/utils";
import {
  QUERY_MIN_LENGTH,
  SEARCH_SUGGESTIONS,
  STATUS_DESCRIPTIONS,
  STATUS_MAPPING,
  DOMAINR_URL,
  DOMAIN_RESEARCH_URL,
} from "./util/constants";
import { DomainStatus, getStatusIcon, Status, IStatusResult } from "./util/types";
import { getDomainStatus, search } from "./util/api";

function DomainrSearch() {
  const [isValidApiKey, setIsValidApiKey] = useState(true);
  const [needsDomainResearchApi, setNeedsDomainResearchApi] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchText);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchText]);

  const { isLoading, data: results } = useCachedPromise(
    async (query: string) => {
      if (query.length < QUERY_MIN_LENGTH) return [];
      const result = await search(query);
      const domains = result.results;
      const statuses = await Promise.all(domains.map(({ domain }) => getDomainStatus(domain)));
      return domains.map((domain, index) => ({
        ...domain,
        ...statuses[index],
      }));
    },
    [debouncedQuery],
    {
      initialData: [],
      keepPreviousData: true,
      onError(error) {
        if (error.cause === 401) setIsValidApiKey(false);
        if (error.cause === 404) setNeedsDomainResearchApi(true);
        showFailureToast(error, {
          title: "Failed to perform search",
        });
      },
    },
  );

  const getPrimaryStatus = (status: string): Status => {
    const statuses = status.split(" ");
    return statuses[statuses.length - 1] as Status;
  };

  const getFilterPredicate = (filterValue: string) => (result: IStatusResult) => {
    if (filterValue === "all") return true;
    const primaryStatus = getPrimaryStatus(result.status);
    const mappedStatus = STATUS_MAPPING[primaryStatus];

    const filterMap: Record<string, (status: DomainStatus) => boolean> = {
      available: (status) => [DomainStatus.Available, DomainStatus.Pending].includes(status),
      aftermarket: (status) => status === DomainStatus.Aftermarket,
      unavailable: (status) =>
        [
          DomainStatus.Taken,
          DomainStatus.Reserved,
          DomainStatus.Disallowed,
          DomainStatus.Invalid,
          DomainStatus.Unknown,
        ].includes(status),
    };

    return filterMap[filterValue]?.(mappedStatus) ?? true;
  };

  const filteredResults = useMemo(() => results.filter(getFilterPredicate(filter)), [results, filter]);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      throttle
      searchBarPlaceholder="Search domains"
      searchBarAccessory={
        searchText.length > 0 ? (
          <List.Dropdown tooltip="Filter by availability" storeValue onChange={setFilter}>
            <List.Dropdown.Item title="All" value="all" />
            <List.Dropdown.Item title="Available" value="available" />
            <List.Dropdown.Item title="Aftermarket" value="aftermarket" />
            <List.Dropdown.Item title="Unavailable" value="unavailable" />
          </List.Dropdown>
        ) : null
      }
    >
      {searchText.length === 0 && isValidApiKey && !isLoading && (
        <List.Section title="Tips & Tricks">
          {SEARCH_SUGGESTIONS.map((item) => (
            <List.Item key={item.title} {...item} />
          ))}
        </List.Section>
      )}

      {!isValidApiKey && (
        <List.Item
          icon={Icon.ExclamationMark}
          title="Invalid API Key"
          accessories={[{ text: "Go to Extensions -> Domainr (Fastly Domain Search)" }]}
          actions={
            <ActionPanel>
              <Action icon={Icon.Gear} title="Open Command Preferences" onAction={openCommandPreferences} />
            </ActionPanel>
          }
        />
      )}

      {needsDomainResearchApi && (
        <List.Item
          icon={Icon.ExclamationMark}
          title="Domain Research API Not Enabled"
          subtitle="Enable it in Fastly Dashboard"
          actions={
            <ActionPanel>
              <Action.OpenInBrowser icon={Icon.Globe} title="Enable Domain Research API" url={DOMAIN_RESEARCH_URL} />
              <Action icon={Icon.Gear} title="Open Command Preferences" onAction={openCommandPreferences} />
            </ActionPanel>
          }
        />
      )}

      {filteredResults.map((result) => {
        const primaryStatus = getPrimaryStatus(result.status);
        const mappedStatus = STATUS_MAPPING[primaryStatus];
        return (
          <List.Item
            key={result.domain}
            icon={getStatusIcon(mappedStatus)}
            title={result.domain}
            subtitle={filter === "all" ? STATUS_DESCRIPTIONS[primaryStatus] : undefined}
            accessories={filter !== "all" ? [{ text: STATUS_DESCRIPTIONS[primaryStatus] }] : undefined}
            actions={
              <ActionPanel>
                {[DomainStatus.Available, DomainStatus.Aftermarket].includes(mappedStatus) && (
                  <Action.OpenInBrowser icon="icon.png" title="Register" url={`${DOMAINR_URL}/${result.domain}`} />
                )}

                {![DomainStatus.Disallowed, DomainStatus.Reserved, DomainStatus.Invalid].includes(mappedStatus) && (
                  <Action.OpenInBrowser
                    icon={getFavicon(`https://${result.domain}`, { fallback: Icon.Globe })}
                    title="Visit"
                    url={`https://${result.domain}`}
                  />
                )}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

export default DomainrSearch;
