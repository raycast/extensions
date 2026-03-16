import { Action, ActionPanel, Icon, List, open } from "@raycast/api";
import { formatDate, issueTitle, MetronIssue } from "./api";
import { IssueDetailView } from "./detail-views";
import type { WeekNav } from "./new-comics";

interface IssueListItemProps {
  issue: MetronIssue;
  showPublisher?: boolean;
  weekNav?: WeekNav;
}

export function IssueListItem({
  issue,
  showPublisher = true,
  weekNav,
}: IssueListItemProps) {
  const title = issueTitle(issue);
  const subtitle = showPublisher
    ? (issue.publisher?.name ?? "")
    : (issue.series?.name ?? "");
  const storeDate = formatDate(issue.store_date ?? issue.cover_date);
  return (
    <List.Item
      title={title}
      subtitle={subtitle}
      icon={
        issue.image ? { source: issue.image, fallback: Icon.Book } : Icon.Book
      }
      accessories={[
        { text: storeDate, icon: Icon.Calendar, tooltip: "Store date" },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="View Details & Variants"
              icon={Icon.Sidebar}
              target={<IssueDetailView issue={issue} />}
            />
            <Action
              title="Open on Metron"
              icon={Icon.Globe}
              onAction={() => open(`https://metron.cloud/issue/${issue.id}/`)}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Title"
              content={title}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy Metron URL"
              content={`https://metron.cloud/issue/${issue.id}/`}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel.Section>
          {weekNav ? (
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
          ) : null}
        </ActionPanel>
      }
    />
  );
}
