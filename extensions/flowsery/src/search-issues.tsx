import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { LoadErrorView } from "./components/load-error-view";
import { api } from "./lib/api";
import { runWithToast } from "./lib/feedback";
import {
  formatDate,
  formatCount,
  ISSUE_SEVERITY_LABELS,
  ISSUE_STATUS_LABELS,
  ISSUE_STATUSES,
  issueMarkdown,
  issuesUrl,
  issueUrl,
  websiteKey,
  websiteName,
  websiteSelector,
} from "./lib/format";
import { Issue, IssueSeverity, IssueStatus, Website } from "./lib/types";
import { useWebsites } from "./lib/use-websites";

const PAGE_SIZE = 50;
const MAX_SEARCH_LENGTH = 200;

const SEVERITY_COLORS: Record<IssueSeverity, Color> = {
  low: Color.SecondaryText,
  medium: Color.Yellow,
  high: Color.Orange,
  critical: Color.Red,
};

const STATUS_ICONS: Record<IssueStatus, Icon> = {
  open: Icon.Circle,
  in_progress: Icon.CircleProgress50,
  resolved: Icon.CheckCircle,
  suspended: Icon.Pause,
};

function IssueDetail({ issue }: { issue: Issue }) {
  return (
    <List.Item.Detail
      markdown={issueMarkdown(issue)}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.TagList title="Severity">
            <List.Item.Detail.Metadata.TagList.Item
              text={ISSUE_SEVERITY_LABELS[issue.severity]}
              color={SEVERITY_COLORS[issue.severity]}
            />
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.Label title="Status" text={ISSUE_STATUS_LABELS[issue.status]} />
          {issue.sessionsCount !== undefined && (
            <List.Item.Detail.Metadata.Label title="Sessions" text={formatCount(issue.sessionsCount)} />
          )}
          {issue.firstSeenAt && (
            <List.Item.Detail.Metadata.Label title="First Seen" text={formatDate(issue.firstSeenAt)} />
          )}
          {issue.lastSeenAt && (
            <List.Item.Detail.Metadata.Label title="Last Seen" text={formatDate(issue.lastSeenAt)} />
          )}
          {issue.externalTicketUrl && (
            <List.Item.Detail.Metadata.Link
              title="Ticket"
              text={issue.externalTicketKey ?? "Open Ticket"}
              target={issue.externalTicketUrl}
            />
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

export default function Command() {
  const {
    data: websites,
    isLoading: isLoadingWebsites,
    error: websitesError,
    revalidate: revalidateWebsites,
  } = useWebsites();
  const [selectedKey, setSelectedKey] = useState<string>();
  const [searchText, setSearchText] = useState("");
  const website = websites?.find((item) => websiteKey(item) === selectedKey) ?? websites?.[0];

  const { data, isLoading, error, pagination, revalidate } = useCachedPromise(
    (selectedWebsite: Website | undefined, search: string) =>
      async ({ page }: { page: number }) => {
        if (!selectedWebsite) return { data: [] as Issue[], hasMore: false };
        const offset = page * PAGE_SIZE;
        const response = await api().listIssues({
          ...websiteSelector(selectedWebsite),
          search: search.trim().slice(0, MAX_SEARCH_LENGTH) || undefined,
          limit: PAGE_SIZE,
          offset,
        });
        const total = response.pagination?.total ?? offset + response.data.length;
        return { data: response.data, hasMore: offset + response.data.length < total };
      },
    [website, searchText],
    {
      execute: Boolean(website),
      keepPreviousData: true,
      failureToastOptions: { title: "Could Not Load Issues" },
    },
  );

  const updateStatus = async (issue: Issue, status: IssueStatus) => {
    const label = ISSUE_STATUS_LABELS[status];
    await runWithToast(
      { pending: `Moving to ${label}`, success: `Moved to ${label}`, failure: "Could Not Update Issue" },
      () => api().updateIssueStatus(issue.id, { websiteId: issue.websiteId }, status),
    );
    revalidate();
  };

  const websiteIssues = data?.filter((issue) => !website?.id || issue.websiteId === website.id) ?? [];
  const loadError = websitesError ?? error;

  return (
    <List
      isLoading={isLoading || isLoadingWebsites}
      isShowingDetail={websiteIssues.length > 0}
      filtering={false}
      throttle
      pagination={pagination}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search issues"
      searchBarAccessory={
        (websites?.length ?? 0) > 1 ? (
          <List.Dropdown tooltip="Website" storeValue onChange={setSelectedKey}>
            {websites?.map((item) => (
              <List.Dropdown.Item key={websiteKey(item)} title={websiteName(item)} value={websiteKey(item)} />
            ))}
          </List.Dropdown>
        ) : undefined
      }
    >
      {loadError && websiteIssues.length === 0 ? (
        <LoadErrorView
          title="Could Not Load Issues"
          error={loadError}
          onRetry={websitesError ? revalidateWebsites : revalidate}
        />
      ) : (
        <List.EmptyView
          icon={Icon.CheckCircle}
          title="No Issues Found"
          actions={
            website && (
              <ActionPanel>
                <Action.OpenInBrowser title="Open Issues" url={issuesUrl(website)} />
              </ActionPanel>
            )
          }
        />
      )}
      {ISSUE_STATUSES.map((status) => {
        const issues = websiteIssues.filter((issue) => issue.status === status);
        return (
          <List.Section key={status} title={ISSUE_STATUS_LABELS[status]} subtitle={String(issues.length)}>
            {issues.map((issue) => (
              <List.Item
                key={issue.id}
                title={issue.title}
                icon={{ source: STATUS_ICONS[issue.status], tintColor: SEVERITY_COLORS[issue.severity] }}
                detail={<IssueDetail issue={issue} />}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      <Action.OpenInBrowser title="Open in Flowsery" url={issueUrl(issue)} />
                      {issue.externalTicketUrl && (
                        <Action.OpenInBrowser title="Open Ticket" url={issue.externalTicketUrl} />
                      )}
                      <Action.CopyToClipboard title="Copy Link" content={issueUrl(issue)} />
                    </ActionPanel.Section>
                    <ActionPanel.Section title="Change Status">
                      {ISSUE_STATUSES.filter((nextStatus) => nextStatus !== issue.status).map((nextStatus) => (
                        <Action
                          key={nextStatus}
                          title={`Move to ${ISSUE_STATUS_LABELS[nextStatus]}`}
                          icon={STATUS_ICONS[nextStatus]}
                          onAction={() => updateStatus(issue, nextStatus)}
                        />
                      ))}
                    </ActionPanel.Section>
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      shortcut={Keyboard.Shortcut.Common.Refresh}
                      onAction={revalidate}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}
