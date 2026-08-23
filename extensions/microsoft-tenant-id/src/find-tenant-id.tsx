import { useState } from "react";
import { Color, Icon, List, type LaunchProps } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { cloudKeyFromLabel, lookupTenant, parseTokens, type TenantResult } from "./lib/tenant";
import { useHistory, type HistoryItem } from "./lib/history";
import { TenantListItem } from "./components/tenant-list-item";

export default function Command(props: LaunchProps<{ arguments: Arguments.FindTenantId }>) {
  const initial = (props.arguments?.query || props.fallbackText || "").trim();
  const [searchText, setSearchText] = useState(initial);

  const tokens = parseTokens(searchText);
  const validDomains = tokens.filter((t) => t.valid).map((t) => t.domain);
  const hasInput = searchText.trim().length > 0;

  const { history, isLoading: historyLoading, record, remove, clear } = useHistory();

  const { data: results, isLoading } = useCachedPromise(
    (domains: string[]) => Promise.all(domains.map(lookupTenant)),
    [validDomains],
    {
      execute: validDomains.length > 0,
      keepPreviousData: true,
      onData: (data) => {
        void record(data);
      },
    },
  );

  // Empty search bar → show recent lookups (or a getting-started hint).
  if (!hasInput) {
    return (
      <List
        isLoading={historyLoading}
        searchText={searchText}
        onSearchTextChange={setSearchText}
        searchBarPlaceholder="Enter a domain, email, or URL — separate several with commas"
      >
        {history.length === 0 ? (
          <List.EmptyView
            icon={{ source: Icon.MagnifyingGlass, tintColor: Color.Blue }}
            title="Find a Microsoft Tenant ID"
            description="Type a domain, email, or URL. Separate several with commas, tabs, or spaces to resolve them all at once."
          />
        ) : (
          <List.Section title="Recent Lookups" subtitle={`${history.length}`}>
            {history.map((item) => (
              <TenantListItem
                key={item.domain}
                result={historyToResult(item)}
                onSearch={setSearchText}
                onRemove={remove}
                onClear={clear}
              />
            ))}
          </List.Section>
        )}
      </List>
    );
  }

  const resultByDomain = new Map((results ?? []).map((r) => [r.domain, r]));
  // keepPreviousData can retain rows from a prior query while a new one loads. Restrict the
  // results to domains still in the search box so the visible list — and the "Copy All" bulk
  // actions — never expose domains the user has already removed.
  const visibleResults = validDomains
    .map((domain) => resultByDomain.get(domain))
    .filter((r): r is TenantResult => Boolean(r));
  const hasSuccess = visibleResults.some((r) => r.tenantId);
  const showDetail = validDomains.length === 1 && hasSuccess;

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Enter a domain, email, or URL — separate several with commas"
      isShowingDetail={showDetail}
      throttle
    >
      {validDomains.length === 0 ? (
        <List.EmptyView
          icon={Icon.Globe}
          title="Keep typing a domain…"
          description="Enter a complete domain like contoso.com. Paste several separated by commas or tabs to look them up together."
        />
      ) : (
        <List.Section title={validDomains.length > 1 ? `${validDomains.length} Domains` : undefined}>
          {validDomains.map((domain) => {
            const result = resultByDomain.get(domain);
            if (result) {
              return (
                <TenantListItem key={domain} result={result} allResults={visibleResults} onSearch={setSearchText} />
              );
            }
            return <List.Item key={domain} icon={Icon.Clock} title={domain} subtitle="Resolving…" />;
          })}
        </List.Section>
      )}
    </List>
  );
}

function historyToResult(item: HistoryItem): TenantResult {
  return {
    input: item.domain,
    domain: item.domain,
    tenantId: item.tenantId,
    cloud: item.cloud ?? cloudKeyFromLabel(item.cloudLabel),
    cloudLabel: item.cloudLabel,
    brandName: item.brandName,
    namespaceType:
      item.namespaceType === "Managed" || item.namespaceType === "Federated" ? item.namespaceType : undefined,
    regionScope: item.regionScope,
  };
}
