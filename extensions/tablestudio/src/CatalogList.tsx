import { Action, Icon, List } from "@raycast/api";
import { useFrecencySorting } from "@raycast/utils";
import { useState } from "react";
import { CATEGORY_TITLES, CatalogItem, SearchCategory, StoredCredentials, categoriesPresent } from "./catalog";
import { CatalogErrorView, CatalogRow, useCatalog } from "./shared";

/**
 * Local databases are deliberately absent here. They live in the "Manage Local Databases"
 * command, because starting and stopping a server is a different job from navigating to one —
 * and because a command that is a strict subset of another is exactly the confusion this
 * replaced (there used to be a separate "Open Connection" command showing nothing this one
 * didn't).
 */
const SEARCHABLE: SearchCategory[] = ["connection", "table", "snippet", "query"];

const ALL = "all";

/** Frecency hooks for a row, so what you open most floats to the top of its section. */
interface Ranking {
  visitItem: (item: CatalogItem) => Promise<void>;
  resetRanking: (item: CatalogItem) => Promise<void>;
}

/**
 * The extension's main list. Raycast fuzzy-matches `title` and `keywords` itself, so the
 * catalog's keywords (a table's column names, a connection's engine and database) become
 * searchable with no filtering code here.
 */
export function CatalogList({ incomingCredentials }: { incomingCredentials?: Partial<StoredCredentials> }) {
  const { items: allItems, error, isStale, isLoading, reload } = useCatalog({ incoming: incomingCredentials });
  const [scope, setScope] = useState<string>(ALL);
  const [searchText, setSearchText] = useState("");

  // Sorted once here and only filtered afterwards, so each section keeps frecency order. Called
  // before the early return below — hooks can't sit behind a condition.
  const { data: rankedItems, visitItem, resetRanking } = useFrecencySorting(allItems);
  const ranking: Ranking = { visitItem, resetRanking };
  const items = rankedItems.filter((item) => SEARCHABLE.includes(item.category));

  if (!isLoading && error) {
    return <CatalogErrorView error={error} onRetry={reload} />;
  }

  // Built from what the app actually sent, not from a hardcoded list: TableStudio withholds
  // whole categories behind compile-time flags, and a scope that can only ever be empty is
  // worse than no scope at all.
  const categories = categoriesPresent(items);
  const visible = scope === ALL ? categories : categories.filter((category) => category === scope);

  const tableCounts = countTablesByConnection(allItems);

  return (
    <List
      isLoading={isLoading}
      // Raycast still does the matching; the text is only read to drop the section counts.
      filtering
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search tables, connections…"
      // One choice isn't a filter, it's decoration.
      searchBarAccessory={
        categories.length > 1 ? (
          <List.Dropdown tooltip="Show" storeValue onChange={setScope}>
            <List.Dropdown.Item title="All" value={ALL} />
            {categories.map((category) => (
              <List.Dropdown.Item key={category} title={CATEGORY_TITLES[category]} value={category} />
            ))}
          </List.Dropdown>
        ) : undefined
      }
    >
      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title="Nothing matched"
        description="Try a table or connection name."
      />
      {visible.map((category) => {
        const inCategory = items.filter((item) => item.category === category);
        if (inCategory.length === 0) return null;

        const rows = inCategory.map((item) => (
          <ConnectionAwareRow
            key={item.id}
            item={item}
            items={rankedItems}
            ranking={ranking}
            tableCount={item.connectionID ? (tableCounts.get(item.connectionID) ?? 0) : 0}
            isStale={isStale}
            onRefresh={reload}
          />
        ));

        // With a scope picked there's only ever one section, and a header repeating the
        // dropdown's own value is noise — unless it's the only place left to say "offline copy".
        if (scope !== ALL && !isStale) return rows;

        // Raycast filters the rows itself and never says how many matched, so while searching
        // the count would be the section's total ("24") above five results. Leave it out then.
        const count = searchText ? undefined : `${inCategory.length}`;

        return (
          <List.Section
            key={category}
            title={CATEGORY_TITLES[category]}
            // Saying it once per section beats a badge on every row: the whole list is stale
            // together, and opening anything launches the app and refreshes it anyway.
            subtitle={isStale ? [count, "offline copy"].filter(Boolean).join(" · ") : count}
          >
            {rows}
          </List.Section>
        );
      })}
    </List>
  );
}

/**
 * A connection row can be drilled into; anything else is an ordinary row.
 *
 * The drill-in goes first, so `↵` browses the connection's tables and `⌘↵` opens it in
 * TableStudio — Raycast gives the first action `↵` and the second `⌘↵`.
 */
function ConnectionAwareRow({
  item,
  items,
  ranking,
  tableCount,
  isStale,
  onRefresh,
}: {
  item: CatalogItem;
  items: CatalogItem[];
  ranking: Ranking;
  tableCount: number;
  isStale: boolean;
  onRefresh: () => void;
}) {
  const onOpen = () => ranking.visitItem(item);
  const onResetRanking = () => ranking.resetRanking(item);

  if (item.category !== "connection") {
    return (
      <CatalogRow item={item} isStale={isStale} onRefresh={onRefresh} onOpen={onOpen} onResetRanking={onResetRanking} />
    );
  }

  return (
    <CatalogRow
      item={item}
      isStale={isStale}
      onRefresh={onRefresh}
      onOpen={onOpen}
      onResetRanking={onResetRanking}
      // Says the connection has children before you open it, and whether drilling in is worth it.
      accessories={tableCount > 0 ? [{ text: `${tableCount} ${tableCount === 1 ? "table" : "tables"}` }] : undefined}
      extraActions={
        <Action.Push
          title="Browse Tables"
          icon={Icon.AppWindowGrid3x3}
          // Drilling into a connection is using it, so it ranks the same as opening it.
          onPush={onOpen}
          target={
            <ConnectionTables connection={item} initialItems={items} initialIsStale={isStale} onRefresh={onRefresh} />
          }
        />
      }
    />
  );
}

/**
 * The tables and views belonging to one connection. Starts from what the main list loaded, but
 * keeps its own copy: props captured by `Action.Push` never change, so Refresh here has to update
 * this screen itself, not only the list underneath.
 */
function ConnectionTables({
  connection,
  initialItems,
  initialIsStale,
  onRefresh,
}: {
  connection: CatalogItem;
  initialItems: CatalogItem[];
  initialIsStale: boolean;
  /** Refreshes the main list too, so going back doesn't land on the old copy. */
  onRefresh: () => void;
}) {
  const { items, error, isStale, isLoading, reload } = useCatalog({
    initial: { items: initialItems, isStale: initialIsStale },
  });
  // Same default namespace as the main list, so rankings are shared, and it re-sorts after a
  // refresh replaces the rows.
  const { data: rankedItems, visitItem, resetRanking } = useFrecencySorting(items);
  const refresh = () => {
    reload();
    onRefresh();
  };

  if (!isLoading && error) {
    return <CatalogErrorView error={error} onRetry={refresh} />;
  }

  const tables = rankedItems.filter(
    (item) => item.category === "table" && item.connectionID === connection.connectionID,
  );
  const rows = tables.map((table) => (
    <CatalogRow
      key={table.id}
      item={table}
      isStale={isStale}
      onRefresh={refresh}
      onOpen={() => visitItem(table)}
      onResetRanking={() => resetRanking(table)}
    />
  ));

  return (
    <List
      isLoading={isLoading}
      navigationTitle={connection.title}
      searchBarPlaceholder={`Search tables in ${connection.title}`}
    >
      {/* A connection whose schema TableStudio hasn't cached publishes no tables at all, which
          would otherwise read as a bug rather than a step the user hasn't taken yet. */}
      <List.EmptyView
        icon={Icon.AppWindowGrid3x3}
        title="No tables published yet"
        description="Open this connection in TableStudio once and its tables appear here."
      />
      {isStale ? (
        <List.Section title={CATEGORY_TITLES.table} subtitle="offline copy">
          {rows}
        </List.Section>
      ) : (
        rows
      )}
    </List>
  );
}

function countTablesByConnection(items: CatalogItem[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) {
    if (item.category !== "table" || !item.connectionID) continue;
    counts.set(item.connectionID, (counts.get(item.connectionID) ?? 0) + 1);
  }
  return counts;
}
