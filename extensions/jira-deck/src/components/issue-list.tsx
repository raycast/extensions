import { Action, ActionPanel, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { ReactNode, useMemo, useState } from "react";
import { changeAssignee } from "../lib/assignee";
import { applyFilters, summarize } from "../lib/filters";
import { BoardColumn, groupByStatus, Issue, IssueGroup, IssuePage, IssueScope, User } from "../lib/issue";
import { userIcon } from "../lib/icons";
import { SetupError } from "../lib/jira";
import { getMoreIssues, getMyself, sourceKey } from "../lib/source";
import { PRIORITY_FILTERS, PriorityLevel, priorityIcon, priorityLabel } from "../lib/priority";
import { CreateIssueDefaults, CreateIssueForm } from "./create-issue-form";
import { IssueActions } from "./issue-actions";
import { IssueDetail } from "./issue-detail";
import { ExtensionActions, PreferencesAction, RetryActions } from "./extension-actions";

interface Props {
  /** Keeps each command's filters separate. */
  id: string;
  /** The first page. Later ones come from its cursor as the list is scrolled. */
  load: () => Promise<IssuePage>;
  /** What `load` shows, like a board's ID. Part of the cache key. */
  loadKey?: string;
  /** Switch Board and friends, for board views. */
  boardActions?: (scope?: IssueScope) => ReactNode;
  createDefaults?: CreateIssueDefaults;
  /** False for lists of one person's issues, where filtering by assignee means nothing. */
  assigneeFilter?: boolean;
}

/** One loaded page. Only the first carries the view itself. */
interface Loaded {
  scope?: IssueScope;
  issues: Issue[];
}

interface Section {
  key: string;
  title: string;
  subtitle: string;
  issues: Issue[];
}

/** A group per board column, in the board's order. Statuses the columns don't hold go last, by status. */
function byColumn(issues: Issue[], columns: BoardColumn[]): IssueGroup[] {
  const column = (issue: Issue) =>
    columns.findIndex((entry) => issue.status.id && entry.statusIds.includes(issue.status.id));
  const groups: IssueGroup[] = columns.map((entry, index) => ({
    title: entry.name,
    issues: issues.filter((issue) => column(issue) === index),
    byStatus: false,
  }));
  const rest = issues.filter((issue) => column(issue) < 0);
  return rest.length ? [...groups, { issues: rest, byStatus: true }] : groups;
}

/** A section per status, per group when the scope has groups, like "Sprint 8 · In Progress". */
function toSections(groups: IssueGroup[]): Section[] {
  return groups.flatMap((group, index) => {
    if (!group.issues.length) return [];
    if (!group.byStatus) {
      const count = String(group.issues.length);
      const subtitle = group.subtitle ? `${group.subtitle} · ${count}` : count;
      return [{ key: `${index}`, title: group.title ?? "Issues", subtitle, issues: group.issues }];
    }
    return groupByStatus(group.issues).map(({ status, issues }) => ({
      key: `${index}:${status.name}`,
      title: group.title ? `${group.title} · ${status.name}` : status.name,
      subtitle: String(issues.length),
      issues,
    }));
  });
}

export function IssueList({ id, load, loadKey = "", boardActions, createDefaults, assigneeFilter = true }: Props) {
  // Part of every cache key, so switching accounts never shows the other one's issues.
  const key = sourceKey();
  const {
    data: pages,
    error,
    isLoading,
    revalidate,
    pagination,
  } = useCachedPromise(
    (what: string, cacheKey: string) => {
      void what;
      void cacheKey;
      return async ({
        page,
        cursor,
      }: {
        page: number;
        cursor?: string;
      }): Promise<{ data: Loaded[]; hasMore: boolean; cursor?: string }> => {
        if (page === 0 || !cursor) {
          const first = await load();
          return {
            data: [{ scope: first.scope, issues: first.scope.issues }],
            hasMore: !!first.cursor,
            cursor: first.cursor,
          };
        }
        const more = await getMoreIssues(cursor);
        return { data: [{ issues: more.issues }], hasMore: !!more.cursor, cursor: more.cursor };
      };
    },
    [loadKey, key],
    {
      // Shown in the empty view when there's nothing else to show, and as a toast over older results.
      onError(error) {
        if (pages?.length) {
          showToast({ style: Toast.Style.Failure, title: "Couldn't load issues", message: error.message });
        }
      },
    },
  );
  // The first page says what the view is, the others only add issues.
  const scope = useMemo((): IssueScope | undefined => {
    const first = pages?.[0]?.scope;
    if (!first) return undefined;
    const complete = first.complete && !pagination?.hasMore;
    return { ...first, issues: pages.flatMap((page) => page.issues), complete };
  }, [pages, pagination?.hasMore]);
  const { data: me } = useCachedPromise(
    (cacheKey: string) => {
      void cacheKey;
      return getMyself();
    },
    [key],
    { onError: () => undefined },
  );
  const [chosenPeople, setPeople] = useCachedState(`${id}:people`, "all");
  // A filter left over from before it was hidden would otherwise still apply.
  const people = assigneeFilter ? chosenPeople : "all";
  const [priority, setPriority] = useCachedState<PriorityLevel | undefined>(`${id}:priority`, undefined);

  // Selects an issue created from here once it's in the list.
  const [focusId, setFocusId] = useState<string>();

  async function assign(issue: Issue, user?: User) {
    if (await changeAssignee(issue, user)) revalidate();
  }

  const groups = useMemo(() => {
    if (!scope) return [];
    // Pages are read by offset, so an issue that moves up the board between two pages comes back twice.
    // Raycast keeps only the first item with an ID, so each issue is listed once, where it showed up first.
    const seen = new Set<string>();
    const filter = (issues: Issue[]) =>
      applyFilters(issues, { people, priority }, me?.accountId ?? "").filter((issue) => {
        if (seen.has(issue.id)) return false;
        seen.add(issue.id);
        return true;
      });
    const base =
      scope.groups ??
      (scope.columns ? byColumn(scope.issues, scope.columns) : [{ issues: scope.issues, byStatus: true }]);
    return base.map((group) => ({
      ...group,
      issues: filter(group.issues),
    }));
  }, [scope, people, priority, me]);
  const issues = useMemo(() => groups.flatMap((group) => group.issues), [groups]);

  // Everyone with an issue in this view, for the assignee dropdown.
  const assignees = useMemo(() => {
    const byId = new Map<string, User>();
    for (const issue of scope?.issues ?? []) if (issue.assignee) byId.set(issue.assignee.accountId, issue.assignee);
    return [...byId.values()]
      .filter((person) => person.accountId !== me?.accountId)
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [scope, me]);

  // Opened while filtered to one person, a new issue goes to them.
  const assigneeDefault = people === "me" ? me : assignees.find((person) => person.accountId === people);
  const createAction = (
    <Action.Push
      title="Create Issue"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={
        <CreateIssueForm
          defaults={{ ...createDefaults, board: scope?.board, sprint: scope?.sprint, assignee: assigneeDefault }}
          onCreated={(issue) => {
            setFocusId(issue.id);
            revalidate();
          }}
        />
      }
    />
  );

  const boardAction = boardActions?.(scope);

  const priorityTitle = PRIORITY_FILTERS.find((filter) => filter.level === priority)?.title;
  const title = [
    scope?.title,
    scope && !scope.notice ? summarize(issues, scope.complete) : undefined,
    priorityTitle ? `${priorityTitle} Priority` : undefined,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <List
      pagination={pagination && { ...pagination, pageSize: 50 }}
      isLoading={isLoading}
      isShowingDetail={issues.length > 0}
      navigationTitle={title}
      selectedItemId={focusId}
      searchBarPlaceholder="Search by key or title"
      searchBarAccessory={
        assigneeFilter ? (
          <List.Dropdown tooltip="Assignee" value={people} onChange={setPeople}>
            <List.Dropdown.Item title="Everyone" value="all" icon={Icon.TwoPeople} />
            <List.Dropdown.Item title="Assigned to Me" value="me" icon={userIcon(me)} />
            <List.Dropdown.Item title="Unassigned" value="unassigned" icon={userIcon()} />
            <List.Dropdown.Section title="People">
              {assignees.map((person) => (
                <List.Dropdown.Item
                  key={person.accountId}
                  title={person.displayName}
                  value={person.accountId}
                  icon={userIcon(person)}
                />
              ))}
            </List.Dropdown.Section>
          </List.Dropdown>
        ) : undefined
      }
    >
      {error && !scope ? (
        <ErrorView error={error} onRetry={revalidate} />
      ) : (
        <List.EmptyView
          icon={Icon.Tray}
          title={scope?.notice ?? (scope?.issues.length ? "No Matching Issues" : "No Issues")}
          description={
            scope?.issues.length
              ? assigneeFilter
                ? "Try another assignee or priority filter."
                : "Try another priority filter."
              : boardAction
                ? "Press ⌘B to switch boards, or ⇧⌘B to pin more."
                : undefined
          }
          actions={
            <ActionPanel>
              {createAction}
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={revalidate}
              />
              {boardAction}
              <ExtensionActions />
            </ActionPanel>
          }
        />
      )}
      {toSections(groups).map(({ key, title, subtitle, issues }) => (
        <List.Section key={key} title={title} subtitle={subtitle}>
          {issues.map((issue) => (
            <List.Item
              key={issue.id}
              id={issue.id}
              // Priority, title and assignee, like Linear. The key and type are in the panel, and search still finds the key.
              icon={{ value: priorityIcon(issue.priority), tooltip: `Priority: ${priorityLabel(issue.priority)}` }}
              title={{ value: issue.summary, tooltip: issue.summary }}
              // A sub-task is found by its parent's key too.
              keywords={issue.parent ? [issue.key, issue.parent.key] : [issue.key]}
              accessories={[
                {
                  icon: userIcon(issue.assignee),
                  tooltip: issue.assignee ? `Assignee: ${issue.assignee.displayName}` : "Unassigned",
                },
              ]}
              detail={<IssueDetail issue={issue} />}
              actions={
                <IssueActions
                  issue={issue}
                  createAction={createAction}
                  boardAction={boardAction}
                  me={me}
                  onAssign={(user) => assign(issue, user)}
                  priority={priority}
                  onPriorityChange={setPriority}
                  onRefresh={revalidate}
                />
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function ErrorView({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const setup = error instanceof SetupError;
  return (
    <List.EmptyView
      icon={setup ? Icon.Key : Icon.Warning}
      title={setup ? "Connect to Jira" : "Couldn't Load Issues"}
      description={error.message}
      actions={
        <ActionPanel>
          {setup ? (
            <>
              <PreferencesAction />
              <Action.OpenInBrowser
                title="Create API Token"
                url="https://id.atlassian.com/manage-profile/security/api-tokens"
              />
              <ExtensionActions preferences={false} />
            </>
          ) : (
            <RetryActions onRetry={onRetry} />
          )}
        </ActionPanel>
      }
    />
  );
}
