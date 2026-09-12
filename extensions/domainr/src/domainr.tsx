import { useState, useEffect, useMemo } from "react";
import { Action, ActionPanel, Icon, List, openCommandPreferences, Keyboard } from "@raycast/api";
import { getFavicon, showFailureToast, useCachedPromise } from "@raycast/utils";
import {
  QUERY_MIN_LENGTH,
  SEARCH_DEBOUNCE_MS,
  SEARCH_SUGGESTIONS,
  STATUS_DETAILS,
  STATUS_MAPPING,
  DOMAINR_URL,
  DOMAIN_RESEARCH_URL,
} from "./util/constants";
import { DomainStatus, getStatusIcon, StatusValue, IStatusResult } from "./util/types";
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
    }, SEARCH_DEBOUNCE_MS);
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

  /**
   * Extracts the primary status from a space-delimited status string.
   *
   * The Domainr API returns statuses "in increasing order of precedence" where
   * the last (right-most) status is considered most important. For example,
   * "marketed undelegated" means the domain is both marketed AND undelegated,
   * with "undelegated" (Available) being the API's primary status.
   *
   * However, for better UX, we prioritize aftermarket statuses (marketed, priced,
   * transferable) since users searching for domains benefit more from knowing
   * a domain is explicitly for sale rather than just technically available.
   *
   * @see https://domainr.com/docs/api/v2/status
   */
  const getPrimaryStatus = (status: string): StatusValue => {
    const statuses = status.split(" ");

    // Prioritize aftermarket indicators for better UX
    const aftermarketStatuses: StatusValue[] = ["marketed", "priced", "transferable"];
    const aftermarket = statuses.find((s) => aftermarketStatuses.includes(s as StatusValue));
    if (aftermarket) return aftermarket as StatusValue;

    // Fall back to API precedence (last status is most important)
    return statuses[statuses.length - 1] as StatusValue;
  };

  const getFilterPredicate = (filterValue: string) => (result: IStatusResult) => {
    if (filterValue === "all") return true;
    const primaryStatus = getPrimaryStatus(result.status);
    const mappedStatus = STATUS_MAPPING[primaryStatus];

    const filterMap: Record<string, (status: DomainStatus) => boolean> = {
      available: (status) => status === DomainStatus.Available,
      maybe: (status) => status === DomainStatus.Maybe,
      unavailable: (status) => status === DomainStatus.Unavailable,
    };

    return filterMap[filterValue]?.(mappedStatus) ?? true;
  };

  const filteredResults = useMemo(() => results.filter(getFilterPredicate(filter)), [results, filter]);

  const groupedResults = useMemo(() => {
    if (filter !== "all") return null;

    const groups: Record<DomainStatus, IStatusResult[]> = {
      [DomainStatus.Available]: [],
      [DomainStatus.Maybe]: [],
      [DomainStatus.Unavailable]: [],
    };

    for (const result of filteredResults) {
      const primaryStatus = getPrimaryStatus(result.status);
      const mappedStatus = STATUS_MAPPING[primaryStatus];
      groups[mappedStatus].push(result);
    }

    return groups;
  }, [filteredResults, filter]);

  const renderDomainItem = (result: IStatusResult) => {
    const primaryStatus = getPrimaryStatus(result.status);
    const mappedStatus = STATUS_MAPPING[primaryStatus];
    return (
      <List.Item
        key={result.domain}
        icon={getStatusIcon(mappedStatus)}
        title={result.domain}
        subtitle={filter !== "all" ? STATUS_DETAILS[primaryStatus] : undefined}
        actions={
          <ActionPanel>
            {[DomainStatus.Available, DomainStatus.Maybe].includes(mappedStatus) && (
              <Action.OpenInBrowser icon="icon.png" title="Register" url={`${DOMAINR_URL}/${result.domain}`} />
            )}

            <Action.OpenInBrowser
              icon={getFavicon(`https://${result.domain}`, { fallback: Icon.Globe })}
              title="Open in Browser"
              url={`https://${result.domain}`}
            />

            <Action.CopyToClipboard
              icon={Icon.Clipboard}
              content={result.domain}
              title="Copy Domain to Clipboard"
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
            <Action.CopyToClipboard
              icon={Icon.Clipboard}
              content={`https://${result.domain}`}
              title="Copy URL to Clipboard"
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
            <Action.Paste
              icon={Icon.Clipboard}
              content={result.domain}
              title="Paste Domain"
              shortcut={{ modifiers: ["cmd"], key: "v" }}
            />
          </ActionPanel>
        }
      />
    );
  };

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
            <List.Dropdown.Item title="Maybe" value="maybe" />
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

      {groupedResults ? (
        <>
          {groupedResults[DomainStatus.Available].length > 0 && (
            <List.Section title="Available">
              {groupedResults[DomainStatus.Available].map(renderDomainItem)}
            </List.Section>
          )}
          {groupedResults[DomainStatus.Maybe].length > 0 && (
            <List.Section title="Maybe">{groupedResults[DomainStatus.Maybe].map(renderDomainItem)}</List.Section>
          )}
          {groupedResults[DomainStatus.Unavailable].length > 0 && (
            <List.Section title="Unavailable">
              {groupedResults[DomainStatus.Unavailable].map(renderDomainItem)}
            </List.Section>
          )}
        </>
      ) : (
        filteredResults.map(renderDomainItem)
      )}
    </List>
  );
}

export default DomainrSearch;
