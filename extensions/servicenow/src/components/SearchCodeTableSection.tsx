import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { memo, useRef } from "react";

import Actions from "./Actions";
import SearchCodeResultListItem from "./SearchCodeResultListItem";
import SearchGroupSubmenu from "./SearchGroupSubmenu";

import { SearchGroupOption } from "../hooks/useSearchGroups";
import { CodeSearchTableResult } from "../types";
import { buildServiceNowUrl } from "../utils/buildServiceNowUrl";

function SearchCodeTableSection({
  active,
  visible,
  instanceName,
  instanceUrl,
  authHeader,
  searchTerm,
  groupScope,
  groups,
  onGroupScopeChange,
  table,
  onComplete,
  isInFavorites,
  revalidateFavorites,
  addUrlToFavorites,
  removeFromFavorites,
}: {
  active: boolean;
  visible: boolean;
  instanceName: string;
  instanceUrl: string;
  authHeader: string;
  searchTerm: string;
  groupScope: string;
  groups: SearchGroupOption[];
  onGroupScopeChange: (scope: string) => void;
  table: string;
  onComplete: (table: string, hits: { label: string; count: number } | null) => void;
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
  });

  const url = `${instanceUrl}/api/sn_codesearch/code_search/search?${params.toString()}`;

  // Notify parent exactly once when the request completes (success or error) so it
  // can advance the X/N progress counter and feed the table-filter dropdown.
  const reportedRef = useRef(false);
  const reportComplete = (hits: { label: string; count: number } | null) => {
    if (!reportedRef.current) {
      reportedRef.current = true;
      onComplete(table, hits);
    }
  };

  const { data, revalidate } = useFetch(url, {
    headers: { Authorization: authHeader, Accept: "application/json" },
    execute: active,
    onData: (mapped: CodeSearchTableResult[]) => {
      const totalHits = mapped.reduce((sum, t) => sum + t.hits.length, 0);
      const label = mapped[0]?.tableLabel ?? table;
      reportComplete(totalHits > 0 ? { label, count: totalHits } : null);
    },
    onError: (error) => {
      console.error(`code_search failed for table ${table}:`, error);
      reportComplete(null);
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

  if (!visible || !data || data.length === 0) return null;

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
                groupScope={groupScope}
                groups={groups}
                onGroupScopeChange={onGroupScopeChange}
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
                  <SearchGroupSubmenu groups={groups} value={groupScope} onChange={onGroupScopeChange} />
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
