import { Action, ActionPanel, Icon, List, openCommandPreferences } from "@raycast/api";
import { useState } from "react";
import { DomainStatus, getStatusIcon } from "./util/types";
import { QUERY_MIN_LENGTH, SEARCH_SUGGESTIONS, STATUS_DESCRIPTIONS, STATUS_MAPPING } from "./util/costants";
import { getFavicon, showFailureToast, useCachedPromise } from "@raycast/utils";
import { getDomainStatus, search } from "./util/api";

function DomainrSearch() {
  const [isValidApiKey, setIsValidApiKey] = useState(true);
  const [query, setQuery] = useState("");

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
    [query],
    {
      initialData: [],
      onError(error) {
        if (error.cause === 401) setIsValidApiKey(false);
        showFailureToast(error, {
          title: "Failed to perform search",
        });
      },
    },
  );

  return (
    <List isLoading={isLoading} onSearchTextChange={setQuery} throttle searchBarPlaceholder="Search domains">
      {query.length === 0 && isValidApiKey && !isLoading && (
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

      {results.map((result) => (
        <List.Item
          key={result.domain}
          icon={getStatusIcon(STATUS_MAPPING[result.status])}
          title={result.domain}
          subtitle={STATUS_MAPPING[result.status]}
          accessories={[{ text: STATUS_DESCRIPTIONS[result.status] }]}
          actions={
            <ActionPanel>
              {[DomainStatus.Available, DomainStatus.Aftermarket].includes(STATUS_MAPPING[result.status]) && (
                <Action.OpenInBrowser icon="icon.png" title="Register" url={`https://domainr.com/${result.domain}`} />
              )}

              {![DomainStatus.Disallowed, DomainStatus.Reserved, DomainStatus.Invalid].includes(
                STATUS_MAPPING[result.status],
              ) && (
                <Action.OpenInBrowser
                  icon={getFavicon(`https://${result.domain}`, { fallback: Icon.Globe })}
                  title="Visit"
                  url={`https://${result.domain}`}
                />
              )}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default DomainrSearch;
