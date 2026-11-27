import { useMemo, useState } from "react";
import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { BrowserItemActions } from "./components/BrowserItemActions";
import { FallbackSearchItem } from "./components/FallbackSearchItem";
import { NotInstalledView } from "./components/NotInstalledView";
import { useHistory, useSearchInstalled } from "./hooks/useSearchBrowser";
import { getSiteIcon } from "./lib/data";
import { formatVisitTime, getDateSectionLabel, getDomain, matchesQuery } from "./lib/utils";

const SECTION_ORDER = ["Today", "Yesterday", "This Week", "This Month", "Older"] as const;

export default function SearchHistoryCommand() {
  const [searchText, setSearchText] = useState("");

  const { data: installed, isLoading: checkingInstall } = useSearchInstalled();
  const { data, error, isLoading, revalidate } = useHistory();

  const grouped = useMemo(() => {
    const matching = (data?.history ?? [])
      .filter((entry) => matchesQuery(searchText, entry.title, entry.url))
      .slice(0, 200);

    const now = new Date();
    const buckets = new Map<string, typeof matching>();
    for (const label of SECTION_ORDER) buckets.set(label, []);

    for (const entry of matching) {
      const label = getDateSectionLabel(entry.lastVisited, now);
      buckets.get(label)?.push(entry);
    }

    return SECTION_ORDER.map((label) => [label, buckets.get(label) ?? []] as const).filter(
      ([, items]) => items.length > 0
    );
  }, [data, searchText]);

  if (!checkingInstall && installed === false) {
    return <NotInstalledView />;
  }

  const totalShown = grouped.reduce((acc, [, items]) => acc + items.length, 0);

  return (
    <List
      isLoading={checkingInstall || isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search browsing history in Search Browser..."
      filtering={false}
      throttle
    >
      {error ? (
        <List.EmptyView
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          title="Failed to Read History"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ) : (
        <>
          {grouped.map(([sectionTitle, entries]) => (
            <List.Section key={sectionTitle} title={sectionTitle} subtitle={`${entries.length}`}>
              {entries.map((entry) => (
                <List.Item
                  key={entry.id}
                  icon={getSiteIcon(entry.url)}
                  title={entry.title}
                  subtitle={getDomain(entry.url)}
                  accessories={[
                    ...(entry.visitCount > 1
                      ? [{ text: `${entry.visitCount}×`, tooltip: `${entry.visitCount} visits` }]
                      : []),
                    { text: formatVisitTime(entry.lastVisited), tooltip: entry.lastVisited.toLocaleString() },
                  ]}
                  actions={<BrowserItemActions title={entry.title} url={entry.url} onRefresh={revalidate} />}
                />
              ))}
            </List.Section>
          ))}

          {searchText.trim() && (
            <List.Section title={totalShown > 0 ? "Web" : "Search Web"}>
              <FallbackSearchItem query={searchText} browserSettings={data?.settings} />
            </List.Section>
          )}

          {totalShown === 0 && !searchText.trim() && !isLoading && (
            <List.EmptyView
              icon={Icon.Clock}
              title="No History Entries"
              description="Sites you visit in Search Browser will appear here."
            />
          )}
        </>
      )}
    </List>
  );
}
