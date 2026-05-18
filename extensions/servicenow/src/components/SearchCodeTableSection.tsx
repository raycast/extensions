import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { memo, useRef } from "react";

import Actions from "./Actions";
import SearchCodeResultListItem from "./SearchCodeResultListItem";

import { CodeSearchTableResult } from "../types";
import { buildServiceNowUrl } from "../utils/buildServiceNowUrl";

function SearchCodeTableSection({
  active,
  instanceName,
  instanceUrl,
  authHeader,
  searchTerm,
  groupScope,
  table,
  onComplete,
  isInFavorites,
  revalidateFavorites,
  addUrlToFavorites,
  removeFromFavorites,
}: {
  active: boolean;
  instanceName: string;
  instanceUrl: string;
  authHeader: string;
  searchTerm: string;
  groupScope: string;
  table: string;
  onComplete: () => void;
  isInFavorites: (path: string) => string;
  revalidateFavorites: () => void;
  addUrlToFavorites: (title: string, url: string, groupId?: string, revalidate?: () => void) => void;
  removeFromFavorites: (id: string, title: string, isGroup: boolean, revalidate?: () => void) => Promise<void>;
}) {
  const params = new URLSearchParams({
    term: searchTerm,
    search_all_scopes: "true",
    current_app: groupScope,
    table,
    limit: "100",
  });

  const url = `${instanceUrl}/api/sn_codesearch/code_search/search?${params.toString()}`;

  // Notify parent exactly once when the request completes (success or error) so it
  // can advance the X/N progress counter.
  const reportedRef = useRef(false);
  const reportComplete = () => {
    if (!reportedRef.current) {
      reportedRef.current = true;
      onComplete();
    }
  };

  const { data, revalidate } = useFetch(url, {
    headers: { Authorization: authHeader, Accept: "application/json" },
    execute: active,
    onData: reportComplete,
    onError: (error) => {
      console.error(`code_search failed for table ${table}:`, error);
      reportComplete();
    },
    mapResult(response: { result?: CodeSearchTableResult | CodeSearchTableResult[] }) {
      // When `&table=<name>` is passed the API returns a single object; without it,
      // an array of per-table results. Normalize to an array.
      const resultArray = Array.isArray(response.result) ? response.result : response.result ? [response.result] : [];
      // Strip fields we never render so 21 cached responses don't blow the worker's
      // heap — `escaped` is just an HTML-escaped duplicate of `context`, and the
      // top-level extras (modified, hit.tableLabel) aren't used by either the list
      // or the match detail view.
      const newHits = resultArray
        .filter((r) => (r.hits?.length ?? 0) > 0)
        .map((tableResult) => ({
          tableLabel: tableResult.tableLabel,
          recordType: tableResult.recordType,
          hits: tableResult.hits.map((hit) => ({
            className: hit.className,
            sysId: hit.sysId,
            name: hit.name,
            matches: hit.matches.map((m) => ({
              field: m.field,
              fieldLabel: m.fieldLabel,
              count: m.count,
              lineMatches: m.lineMatches.map((lm) => ({
                line: lm.line,
                context: lm.context,
              })),
            })),
          })),
        }));
      return { data: newHits };
    },
  });

  if (!data || data.length === 0) return null;

  return (
    <>
      {data.map((tableResult, index) => {
        const className = tableResult.recordType || tableResult.hits[0]?.className || "";
        const sysIds = tableResult.hits.map((h) => h.sysId).join(",");
        const allResultsUrl = buildServiceNowUrl(instanceName, `${className}_list.do?sysparm_query=sys_idIN${sysIds}`);
        return (
          <List.Section
            key={`${tableResult.tableLabel}_${index}`}
            title={tableResult.tableLabel}
            subtitle={`${tableResult.hits.length} ${tableResult.hits.length == 1 ? "hit" : "hits"}`}
          >
            {tableResult.hits.map((hit) => (
              <SearchCodeResultListItem
                key={hit.sysId}
                hit={hit}
                tableLabel={tableResult.tableLabel}
                instanceName={instanceName}
                revalidateSearchResults={revalidate}
                favoriteId={isInFavorites(`/${hit.className}.do?sys_id=${hit.sysId}`)}
                addUrlToFavorites={addUrlToFavorites}
                removeFromFavorites={removeFromFavorites}
                revalidateFavorites={revalidateFavorites}
              />
            ))}
            <List.Item
              key={`${tableResult.tableLabel}-all`}
              icon={{ source: Icon.MagnifyingGlass, tintColor: Color.SecondaryText }}
              title={`View all ${tableResult.tableLabel} matches`}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title={`View all ${tableResult.tableLabel} matches`}>
                    <Action.OpenInBrowser
                      title="Open in ServiceNow"
                      url={allResultsUrl}
                      icon={{ source: "servicenow.svg" }}
                    />
                    <Action.CopyToClipboard title="Copy URL" content={allResultsUrl} />
                  </ActionPanel.Section>
                  <Actions revalidate={revalidate} />
                </ActionPanel>
              }
            />
          </List.Section>
        );
      })}
    </>
  );
}

export default memo(SearchCodeTableSection);
