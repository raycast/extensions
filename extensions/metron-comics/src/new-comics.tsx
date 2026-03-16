import { List, showToast, Toast, Icon, Action, ActionPanel, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import { fetchWeeklyIssues, formatDate, MetronIssue, thisWednesday, endOfWeek } from "./api";
import { IssueListItem } from "./components";

function offsetWeek(dateStr: string, weeks: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + weeks * 7);
  return d.toISOString().split("T")[0];
}

export interface WeekNav {
  onPrevWeek: () => void;
  onNextWeek: (() => void) | null;
  onThisWeek: (() => void) | null;
}

export default function NewComicsCommand() {
  const { defaultPublisher } = getPreferenceValues<Preferences.NewComics>();
  const [issues, setIssues] = useState<MetronIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [publisherFilter, setPublisherFilter] = useState(defaultPublisher ?? "");
  const [weekStart, setWeekStart] = useState(thisWednesday());

  const isCurrentWeek = weekStart === thisWednesday();
  const weekEnd = endOfWeek(weekStart);
  const weekLabel = `${formatDate(weekStart)} – ${formatDate(weekEnd)}`;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchWeeklyIssues(weekStart, publisherFilter || undefined);
        if (!cancelled) setIssues(data);
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Failed to load.";
          setError(message);
          await showToast({ style: Toast.Style.Failure, title: "Error", message });
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [publisherFilter, weekStart]);

  // Fix: was i.issue (non-existent) — correct field is i.number
  const filtered = searchText
    ? issues.filter(
        (i) =>
          (i.series?.name ?? "").toLowerCase().includes(searchText.toLowerCase()) ||
          (i.number ?? "").toLowerCase().includes(searchText.toLowerCase()) ||
          (i.issue_name ?? "").toLowerCase().includes(searchText.toLowerCase()),
      )
    : issues;

  const weekNav: WeekNav = {
    onPrevWeek: () => setWeekStart(offsetWeek(weekStart, -1)),
    onNextWeek: !isCurrentWeek ? () => setWeekStart(offsetWeek(weekStart, 1)) : null,
    onThisWeek: !isCurrentWeek ? () => setWeekStart(thisWednesday()) : null,
  };

  const emptyActions = (
    <ActionPanel>
      <ActionPanel.Section title="Navigate Weeks">
        <Action
          title="Previous Week"
          icon={Icon.ArrowLeft}
          shortcut={{ modifiers: ["cmd"], key: "[" }}
          onAction={weekNav.onPrevWeek}
        />
        {weekNav.onNextWeek ? (
          <Action
            title="Next Week"
            icon={Icon.ArrowRight}
            shortcut={{ modifiers: ["cmd"], key: "]" }}
            onAction={weekNav.onNextWeek}
          />
        ) : null}
        {weekNav.onThisWeek ? (
          <Action
            title="Jump to This Week"
            icon={Icon.Calendar}
            shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
            onAction={weekNav.onThisWeek}
          />
        ) : null}
      </ActionPanel.Section>
    </ActionPanel>
  );

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`New Comics — ${weekLabel}`}
      searchBarPlaceholder="Filter by title or series..."
      onSearchTextChange={setSearchText}
      throttle
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Publisher" value={publisherFilter} onChange={setPublisherFilter}>
          <List.Dropdown.Item title="All Publishers" value="" />
          <List.Dropdown.Section title="Major Publishers">
            <List.Dropdown.Item title="Marvel Comics" value="Marvel" />
            <List.Dropdown.Item title="DC Comics" value="DC Comics" />
            <List.Dropdown.Item title="Image Comics" value="Image" />
            <List.Dropdown.Item title="IDW Publishing" value="IDW" />
            <List.Dropdown.Item title="BOOM! Studios" value="BOOM!" />
            <List.Dropdown.Item title="Dark Horse Comics" value="Dark Horse" />
            <List.Dropdown.Item title="Oni Press" value="Oni" />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Could not load new comics"
          description={error}
          actions={emptyActions}
        />
      ) : issues.length === 0 && !isLoading ? (
        <List.EmptyView icon="📭" title="No comics found" description="Try a different week." actions={emptyActions} />
      ) : (
        <List.Section title={weekLabel} subtitle={`${filtered.length} issues`}>
          {filtered.map((issue) => (
            <IssueListItem key={issue.id} issue={issue} showPublisher={false} weekNav={weekNav} />
          ))}
        </List.Section>
      )}
    </List>
  );
}
