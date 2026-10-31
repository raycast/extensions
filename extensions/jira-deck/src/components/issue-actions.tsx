import { Action, ActionPanel, Icon, Keyboard, showToast, Toast } from "@raycast/api";
import { ReactNode, useState } from "react";
import { userIcon } from "../lib/icons";
import { Issue, User } from "../lib/issue";
import { PRIORITY_FILTERS, PriorityLevel } from "../lib/priority";
import { getAssignableUsers } from "../lib/source";
import { ShowLinkedIssuesAction } from "./linked-issues";
import { ExtensionActions } from "./extension-actions";

interface Props {
  issue: Issue;
  createAction: ReactNode;
  boardAction: ReactNode;
  me?: User;
  onAssign: (user?: User) => void;
  priority?: PriorityLevel;
  onPriorityChange: (priority?: PriorityLevel) => void;
  onRefresh: () => void;
}

export function IssueActions({
  issue,
  createAction,
  boardAction,
  me,
  onAssign,
  priority,
  onPriorityChange,
  onRefresh,
}: Props) {
  return (
    <ActionPanel title={issue.key}>
      <ActionPanel.Section>
        <Action.OpenInBrowser title="Open in Jira" url={issue.url} shortcut={Keyboard.Shortcut.Common.Open} />
        <Action.CopyToClipboard title="Copy Key" content={issue.key} shortcut={Keyboard.Shortcut.Common.Copy} />
        <Action.CopyToClipboard title="Copy URL" content={issue.url} shortcut={Keyboard.Shortcut.Common.CopyName} />
        <ShowLinkedIssuesAction issue={issue} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        {createAction}
        <AssigneeSubmenu issue={issue} me={me} onAssign={onAssign} />
        {me && issue.assignee?.accountId !== me.accountId && (
          <Action
            title="Assign to Me"
            icon={userIcon(me)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
            onAction={() => onAssign(me)}
          />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section>
        {boardAction}
        {/* Raycast has room for one search bar dropdown, which is taken by people. */}
        <ActionPanel.Submenu
          title="Filter by Priority"
          icon={Icon.Filter}
          shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
        >
          <Action
            title="All Priorities"
            icon={priority ? Icon.Circle : Icon.CheckCircle}
            onAction={() => onPriorityChange(undefined)}
          />
          {PRIORITY_FILTERS.map(({ level, title }) => (
            <Action
              key={level}
              title={title}
              icon={priority === level ? Icon.CheckCircle : Icon.Circle}
              onAction={() => onPriorityChange(level)}
            />
          ))}
        </ActionPanel.Submenu>
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={onRefresh}
        />
      </ActionPanel.Section>
      <ExtensionActions />
    </ActionPanel>
  );
}

/** Loads the people when opened, since Jira decides per issue who can be assigned. */
function AssigneeSubmenu({ issue, me, onAssign }: { issue: Issue; me?: User; onAssign: (user?: User) => void }) {
  const [people, setPeople] = useState<User[]>();
  const [isLoading, setIsLoading] = useState(false);

  async function load() {
    if (people || isLoading) return;
    setIsLoading(true);
    try {
      setPeople(await getAssignableUsers(issue));
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't load people",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  const current = (user?: User) => (issue.assignee?.accountId === user?.accountId ? Icon.CheckCircle : undefined);

  return (
    <ActionPanel.Submenu
      title="Change Assignee"
      icon={Icon.AddPerson}
      shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
      isLoading={isLoading}
      onOpen={load}
    >
      <Action title="Unassigned" icon={current(undefined) ?? userIcon()} onAction={() => onAssign(undefined)} />
      {people?.map((person) => (
        <Action
          key={person.accountId}
          title={person.accountId === me?.accountId ? `${person.displayName} (Me)` : person.displayName}
          icon={current(person) ?? userIcon(person)}
          onAction={() => onAssign(person)}
        />
      ))}
    </ActionPanel.Submenu>
  );
}
