import {
  Action,
  ActionPanel,
  Color,
  getPreferenceValues,
  Icon,
  LaunchType,
  List,
  launchCommand,
  openExtensionPreferences,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { buildIssueUrl, listCompanies, listIssues, type Issue, type PaperclipPreferences } from "./api";

const ACTIVE_STATUSES = ["backlog", "todo", "in_progress", "in_review", "blocked"];

export type StatusFilter = "active" | "all" | "in_review" | "blocked" | "review_or_blocked";

type IssueListItem = Issue & {
  companyName: string;
  issueUrl: string;
};

type LoadState = {
  issues: IssueListItem[];
  companyCount: number;
};

type PaperclipIssuesListProps = {
  defaultStatusFilter?: StatusFilter;
  navigationTitle?: string;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

function formatStatus(status: string) {
  return status.replace(/_/g, " ");
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function toTimestamp(value: string) {
  return Number.isNaN(Date.parse(value)) ? 0 : Date.parse(value);
}

function statusColor(status: string) {
  switch (status) {
    case "backlog":
      return Color.SecondaryText;
    case "todo":
      return Color.Blue;
    case "in_progress":
      return Color.Orange;
    case "in_review":
      return Color.Purple;
    case "blocked":
      return Color.Red;
    case "done":
      return Color.Green;
    case "cancelled":
      return Color.Magenta;
    default:
      return Color.SecondaryText;
  }
}

function renderIssueMarkdown(issue: IssueListItem) {
  const description = issue.description?.trim() || "_No description provided._";
  const runningNote = issue.activeRun
    ? `\n\n> Active run: ${issue.activeRun.status.replace(/_/g, " ")}`
    : "";

  return `# ${issue.identifier}\n\n## ${issue.title}\n\n${description}${runningNote}`;
}

function compareIssuesByDescendingChronology(left: IssueListItem, right: IssueListItem) {
  const updatedDifference = toTimestamp(right.updatedAt) - toTimestamp(left.updatedAt);
  if (updatedDifference !== 0) {
    return updatedDifference;
  }

  const createdDifference = toTimestamp(right.createdAt) - toTimestamp(left.createdAt);
  if (createdDifference !== 0) {
    return createdDifference;
  }

  return right.issueNumber - left.issueNumber;
}

function getStatusQuery(statusFilter: StatusFilter) {
  switch (statusFilter) {
    case "active":
      return ACTIVE_STATUSES.join(",");
    case "in_review":
      return "in_review";
    case "blocked":
      return "blocked";
    case "review_or_blocked":
      return "in_review,blocked";
    case "all":
    default:
      return undefined;
  }
}

function getStatusFilterLabel(statusFilter: StatusFilter) {
  switch (statusFilter) {
    case "active":
      return "Active";
    case "all":
      return "All";
    case "in_review":
      return "In Review";
    case "blocked":
      return "Blocked";
    case "review_or_blocked":
      return "Review or Blocked";
  }
}

function getStatusEmptyDescription(statusFilter: StatusFilter) {
  switch (statusFilter) {
    case "active":
      return "Try a broader search or switch to a different status filter.";
    case "all":
      return "Try a different search term.";
    case "in_review":
      return "Try a different search term or switch to another status filter.";
    case "blocked":
      return "Try a different search term or switch to another status filter.";
    case "review_or_blocked":
      return "Try a different search term or switch to another status filter.";
  }
}

function IssueMetadata(props: { issue: IssueListItem }) {
  const { issue } = props;

  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Company" text={issue.companyName} />
      <List.Item.Detail.Metadata.Label title="Identifier" text={issue.identifier} />
      <List.Item.Detail.Metadata.Label
        title="Status"
        text={{ value: formatStatus(issue.status), color: statusColor(issue.status) }}
      />
      {issue.priority ? <List.Item.Detail.Metadata.Label title="Priority" text={issue.priority} /> : null}
      <List.Item.Detail.Metadata.Label title="Updated" text={formatDate(issue.updatedAt)} />
      <List.Item.Detail.Metadata.Link title="Browser" target={issue.issueUrl} text={issue.issueUrl} />
      {issue.labels.length > 0 ? (
        <List.Item.Detail.Metadata.TagList title="Labels">
          {issue.labels.map((label) => (
            <List.Item.Detail.Metadata.TagList.Item key={label} text={label} />
          ))}
        </List.Item.Detail.Metadata.TagList>
      ) : null}
    </List.Item.Detail.Metadata>
  );
}

async function loadIssues(
  preferences: PaperclipPreferences,
  searchText: string,
  statusFilter: StatusFilter,
  signal?: AbortSignal,
): Promise<LoadState> {
  const companies = await listCompanies(preferences, signal);
  const status = getStatusQuery(statusFilter);
  const issuesPerCompany = await Promise.all(
    companies.map(async (company) => {
      const issues = await listIssues(preferences, company.id, {
        q: searchText,
        status,
        signal,
      });

      return issues.map((issue) => ({
        ...issue,
        companyName: company.name,
        issueUrl: buildIssueUrl(preferences.apiBaseUrl, company.issuePrefix, issue.identifier),
      }));
    }),
  );

  const issues = issuesPerCompany.flat().sort(compareIssuesByDescendingChronology);

  return {
    issues,
    companyCount: companies.length,
  };
}

export function PaperclipIssuesList(props: PaperclipIssuesListProps) {
  const { defaultStatusFilter = "active", navigationTitle = "Paperclip Issues" } = props;
  const preferenceValues = getPreferenceValues<Preferences>();
  const preferences = useMemo<PaperclipPreferences>(
    () => ({
      apiBaseUrl: preferenceValues.apiBaseUrl,
      authMode: preferenceValues.authMode,
      apiKey: preferenceValues.apiKey,
      customAuthHeaderName: preferenceValues.customAuthHeaderName,
      customAuthHeaderValue: preferenceValues.customAuthHeaderValue,
    }),
    [
      preferenceValues.apiBaseUrl,
      preferenceValues.authMode,
      preferenceValues.apiKey,
      preferenceValues.customAuthHeaderName,
      preferenceValues.customAuthHeaderValue,
    ],
  );
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(defaultStatusFilter);
  const [showDetail, setShowDetail] = useState(true);
  const [reloadCount, setReloadCount] = useState(0);
  const [state, setState] = useState<LoadState>({ issues: [], companyCount: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    setStatusFilter(defaultStatusFilter);
  }, [defaultStatusFilter]);

  useEffect(() => {
    const abortController = new AbortController();
    let isCurrent = true;

    async function run() {
      setIsLoading(true);
      setError(undefined);

      try {
        const nextState = await loadIssues(preferences, searchText, statusFilter, abortController.signal);
        if (isCurrent) {
          setState(nextState);
        }
      } catch (nextError) {
        if (!isCurrent || abortController.signal.aborted) {
          return;
        }
        setError(getErrorMessage(nextError));
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    run();

    return () => {
      isCurrent = false;
      abortController.abort();
    };
  }, [preferences, reloadCount, searchText, statusFilter]);

  const groupedIssues = useMemo(() => {
    const groups = new Map<string, IssueListItem[]>();

    for (const issue of state.issues) {
      const existing = groups.get(issue.companyName);
      if (existing) {
        existing.push(issue);
      } else {
        groups.set(issue.companyName, [issue]);
      }
    }

    return Array.from(groups.entries());
  }, [state.issues]);

  const emptyTitle = error
    ? "Couldn’t load Paperclip issues"
    : state.companyCount === 0
      ? "No active companies found"
      : searchText.trim()
        ? "No matching issues"
        : "No issues found";

  const emptyDescription = error
    ? error
    : state.companyCount === 0
      ? "The configured Paperclip server did not return any active companies."
      : getStatusEmptyDescription(statusFilter);

  const filterActions = (
    <>
      <Action title="Show Active Issues" icon={Icon.Switch} onAction={() => setStatusFilter("active")} />
      <Action title="Show All Issues" icon={Icon.Switch} onAction={() => setStatusFilter("all")} />
      <Action title="Show Issues In Review" icon={Icon.Switch} onAction={() => setStatusFilter("in_review")} />
      <Action title="Show Blocked Issues" icon={Icon.Switch} onAction={() => setStatusFilter("blocked")} />
      <Action title="Show Review or Blocked Issues" icon={Icon.Switch} onAction={() => setStatusFilter("review_or_blocked")} />
    </>
  );

  async function openCreateIssueCommand(companyId?: string) {
    await launchCommand({
      name: "create-issue",
      type: LaunchType.UserInitiated,
      context: companyId ? { companyId } : undefined,
    });
  }

  return (
    <List
      filtering={false}
      isLoading={isLoading}
      isShowingDetail={showDetail}
      navigationTitle={navigationTitle}
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown tooltip="Status Filter" value={statusFilter} onChange={(value) => setStatusFilter(value as StatusFilter)}>
          <List.Dropdown.Item title="Active" value="active" />
          <List.Dropdown.Item title="All" value="all" />
          <List.Dropdown.Item title="In Review" value="in_review" />
          <List.Dropdown.Item title="Blocked" value="blocked" />
          <List.Dropdown.Item title="Review or Blocked" value="review_or_blocked" />
        </List.Dropdown>
      }
      searchBarPlaceholder={`Search ${getStatusFilterLabel(statusFilter).toLowerCase()} issues by title or identifier`}
      searchText={searchText}
      throttle
      actions={
        <ActionPanel>
          <Action title="Create New Issue" icon={Icon.PlusCircle} onAction={() => openCreateIssueCommand()} />
          <Action title="Reload" icon={Icon.ArrowClockwise} onAction={() => setReloadCount((value) => value + 1)} />
          {filterActions}
          <Action
            title={showDetail ? "Hide Details" : "Show Details"}
            icon={showDetail ? Icon.Sidebar : Icon.AppWindowSidebarLeft}
            onAction={() => setShowDetail((value) => !value)}
          />
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    >
      {state.issues.length === 0 ? (
        <List.EmptyView
          title={emptyTitle}
          description={emptyDescription}
          icon={error ? Icon.ExclamationMark : Icon.MagnifyingGlass}
          actions={
            <ActionPanel>
              <Action title="Create New Issue" icon={Icon.PlusCircle} onAction={() => openCreateIssueCommand()} />
              <Action title="Reload" icon={Icon.ArrowClockwise} onAction={() => setReloadCount((value) => value + 1)} />
              {filterActions}
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ) : (
        groupedIssues.map(([companyName, issues]) => (
          <List.Section key={companyName} title={companyName} subtitle={String(issues.length)}>
            {issues.map((issue) => {
              const accessories: List.Item.Accessory[] = [];
              if (!showDetail) {
                if (issue.activeRun) {
                  accessories.push({ tag: { value: "Running", color: Color.Orange } });
                }
                accessories.push({
                  tag: { value: formatStatus(issue.status), color: statusColor(issue.status) },
                });
              }

              return (
                <List.Item
                  key={issue.id}
                  id={issue.id}
                  title={issue.title}
                  subtitle={issue.identifier}
                  keywords={[issue.identifier, issue.companyName, issue.status, ...issue.labels]}
                  icon={{ source: Icon.CircleFilled, tintColor: statusColor(issue.status) }}
                  accessories={accessories}
                  detail={
                    showDetail ? (
                      <List.Item.Detail markdown={renderIssueMarkdown(issue)} metadata={<IssueMetadata issue={issue} />} />
                    ) : undefined
                  }
                  actions={
                    <ActionPanel title={issue.identifier}>
                    <Action.OpenInBrowser title="Open Issue in Browser" url={issue.issueUrl} />
                      <Action title="Create New Issue" icon={Icon.PlusCircle} onAction={() => openCreateIssueCommand(issue.companyId)} />
                      <Action.CopyToClipboard title="Copy Issue URL" content={issue.issueUrl} />
                      <Action.CopyToClipboard title="Copy Identifier" content={issue.identifier} />
                      {filterActions}
                      <Action
                        title={showDetail ? "Hide Details" : "Show Details"}
                        icon={showDetail ? Icon.Sidebar : Icon.AppWindowSidebarLeft}
                        onAction={() => setShowDetail((value) => !value)}
                      />
                      <Action title="Reload" icon={Icon.ArrowClockwise} onAction={() => setReloadCount((value) => value + 1)} />
                      <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        ))
      )}
    </List>
  );
}
