import { LaunchProps, List } from "@raycast/api";
import { useState } from "react";
import { usePortfolio } from "./lib/hooks";
import { usePrivacy } from "./lib/privacy";
import { flattenPositions, searchPositions } from "./lib/portfolio";
import { classifyError, ListEmpty } from "./components/empty";
import { PositionItem } from "./components/PositionItem";

/**
 * Every position across accounts. Optional `ticker` argument (e.g. "Show Positions aapl" from the
 * root search) pre-fills the search and opens the detail panel; ranking is exact ticker, then prefix,
 * then name/account substring.
 */
export default function ShowPositions(props: LaunchProps<{ arguments: { ticker?: string } }>) {
  const initial = props.arguments?.ticker?.trim() ?? "";
  const [query, setQuery] = useState(initial);
  const [showDetail, setShowDetail] = useState(initial.length > 0);
  const { snapshot, isLoading, error, refresh } = usePortfolio();
  const { privacy, ready, toggle } = usePrivacy();
  const all = snapshot ? flattenPositions(snapshot.accounts) : [];
  const matches = searchPositions(all, query);

  return (
    <List
      isLoading={isLoading || !ready}
      isShowingDetail={showDetail && matches.length > 0}
      searchText={query}
      onSearchTextChange={setQuery}
      filtering={false}
      searchBarPlaceholder="Search ticker, name or account…"
    >
      {error && all.length === 0 ? (
        <ListEmpty kind={classifyError(error)} error={error} onRetry={refresh} />
      ) : !isLoading && all.length === 0 ? (
        <ListEmpty kind={snapshot && snapshot.accounts.length === 0 ? "connect" : "no-data"} onRetry={refresh} />
      ) : !isLoading && matches.length === 0 ? (
        <List.EmptyView
          title={`No position matches “${query}”`}
          description="Folio only searches what you already hold. It doesn't look up quotes."
        />
      ) : (
        <List.Section title={query ? `Matches for ${query.toUpperCase()}` : "Positions"} subtitle={`${matches.length}`}>
          {matches.map((p) => (
            <PositionItem
              key={p.key}
              position={p}
              privacy={privacy}
              showDetail={showDetail}
              onToggleDetail={() => setShowDetail((v) => !v)}
              onTogglePrivacy={toggle}
              onRefresh={refresh}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
