import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { addIssueComment, deleteIssue, queryIssues, updateIssue } from "./api/ninety";
import { Issue, IssueInterval } from "./api/types";
import { CommentForm } from "./components/CommentForm";
import { IssueForm } from "./components/IssueForm";
import { TeamDropdown } from "./components/TeamDropdown";
import { TodoForm } from "./components/TodoForm";
import { useTeams } from "./hooks/useTeams";
import { useUsers } from "./hooks/useUsers";
import { showError } from "./lib/errors";
import { compact, formatDate, htmlToText, intervalTitle, priorityAccessory } from "./lib/format";
import { NinetyUrls } from "./lib/urls";

const INTERVALS: IssueInterval[] = ["SHORT_TERM", "LONG_TERM"];

function byPriority(a: Issue, b: Issue) {
  return (b.priority ?? 0) - (a.priority ?? 0) || (a.title ?? "").localeCompare(b.title ?? "");
}

function issueMarkdown(issue: Issue, userName: (id?: string) => string | undefined) {
  const lines = [`# ${issue.title ?? "Untitled Issue"}`];
  const description = htmlToText(issue.description);
  if (description) lines.push(description);
  if (issue.comments?.length) {
    lines.push("---", "### Comments");
    for (const comment of issue.comments) {
      const when = comment.createdDate ? ` · ${formatDate(comment.createdDate)}` : "";
      lines.push(`**${userName(comment.userId) ?? "Someone"}**${when}\n\n${comment.text ?? ""}`);
    }
  }
  return lines.join("\n\n");
}

export default function Command() {
  const { teams } = useTeams();
  const { userName } = useUsers();
  const [teamId, setTeamId] = useState("");
  const [showDetail, setShowDetail] = useState(false);

  const { data, isLoading, mutate, revalidate } = useCachedPromise(
    (teamId: string) => queryIssues({ teamId }),
    [teamId],
    {
      execute: !!teamId,
      keepPreviousData: true,
      onError: (error) => {
        showError(error, "Couldn't load Issues");
      },
    },
  );
  const issues = data ?? [];

  async function update(issue: Issue, changes: Parameters<typeof updateIssue>[1], success: string, remove = false) {
    try {
      await mutate(updateIssue(issue.id, changes), {
        optimisticUpdate: (current) =>
          remove
            ? current?.filter((i) => i.id !== issue.id)
            : current?.map((i) =>
                i.id === issue.id
                  ? { ...i, priority: changes.priority ?? i.priority, intervalCode: changes.interval ?? i.intervalCode }
                  : i,
              ),
      });
      await showToast({ style: Toast.Style.Success, title: success });
    } catch (error) {
      await showError(error, "Couldn't update Issue");
    }
  }

  async function remove(issue: Issue) {
    const confirmed = await confirmAlert({
      title: "Delete Issue?",
      message: issue.title,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    try {
      await mutate(deleteIssue(issue.id), { optimisticUpdate: (current) => current?.filter((i) => i.id !== issue.id) });
      await showToast({ style: Toast.Style.Success, title: "Issue deleted" });
    } catch (error) {
      await showError(error, "Couldn't delete Issue");
    }
  }

  const createAction = (
    <Action.Push
      title="Create Issue"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<IssueForm defaultTeamId={teamId} onSaved={() => revalidate()} />}
    />
  );

  return (
    <List
      isLoading={isLoading || !teamId}
      isShowingDetail={showDetail && issues.length > 0}
      searchBarPlaceholder="Filter Issues"
      searchBarAccessory={<TeamDropdown id="issues-team" teams={teams} onChange={setTeamId} />}
    >
      <List.EmptyView
        icon={Icon.Bolt}
        title="No open Issues"
        description="Press ⌘N to add one."
        actions={<ActionPanel>{createAction}</ActionPanel>}
      />
      {INTERVALS.map((interval) => {
        const items = issues.filter((i) => (i.intervalCode ?? "SHORT_TERM") === interval).sort(byPriority);
        const other: IssueInterval = interval === "SHORT_TERM" ? "LONG_TERM" : "SHORT_TERM";
        return (
          <List.Section key={interval} title={intervalTitle(interval)} subtitle={String(items.length)}>
            {items.map((issue) => {
              const title = issue.title ?? "Untitled Issue";
              const owner = userName(issue.userId);
              return (
                <List.Item
                  key={issue.id}
                  title={title}
                  subtitle={showDetail ? undefined : owner}
                  icon={{ source: Icon.Bolt, tintColor: interval === "SHORT_TERM" ? Color.Orange : Color.Purple }}
                  keywords={owner ? [owner] : undefined}
                  accessories={
                    showDetail
                      ? undefined
                      : compact<List.Item.Accessory>([
                          issue.comments?.length
                            ? { icon: Icon.Bubble, text: String(issue.comments.length) }
                            : undefined,
                          priorityAccessory(issue.priority),
                          issue.createdDate ? { date: new Date(issue.createdDate), tooltip: "Created" } : undefined,
                        ])
                  }
                  detail={
                    <List.Item.Detail
                      markdown={issueMarkdown(issue, userName)}
                      metadata={
                        <List.Item.Detail.Metadata>
                          <List.Item.Detail.Metadata.Label title="List" text={intervalTitle(interval)} />
                          <List.Item.Detail.Metadata.Label title="Owner" text={owner ?? "—"} />
                          <List.Item.Detail.Metadata.Label
                            title="Priority"
                            text={issue.priority ? `${issue.priority} of 5` : "None"}
                          />
                          <List.Item.Detail.Metadata.Label title="Created" text={formatDate(issue.createdDate)} />
                        </List.Item.Detail.Metadata>
                      }
                    />
                  }
                  actions={
                    <ActionPanel>
                      <ActionPanel.Section>
                        <Action
                          title="Solve Issue"
                          icon={Icon.CheckCircle}
                          onAction={() => update(issue, { completed: true }, "Issue solved", true)}
                        />
                        <Action
                          title={showDetail ? "Hide Details" : "Show Details"}
                          icon={Icon.Sidebar}
                          shortcut={{
                            macOS: { modifiers: ["cmd"], key: "d" },
                            Windows: { modifiers: ["ctrl"], key: "d" },
                          }}
                          onAction={() => setShowDetail((v) => !v)}
                        />
                        <Action.OpenInBrowser title="Open in Ninety" url={NinetyUrls.issues} />
                      </ActionPanel.Section>
                      <ActionPanel.Section>
                        <Action.Push
                          title="Create Linked To-Do"
                          icon={Icon.CheckList}
                          shortcut={{
                            macOS: { modifiers: ["cmd", "shift"], key: "t" },
                            Windows: { modifiers: ["ctrl", "shift"], key: "t" },
                          }}
                          target={
                            <TodoForm
                              defaultTeamId={issue.teamId}
                              link={{ id: issue.id, type: "issue", title }}
                              onSaved={() => revalidate()}
                            />
                          }
                        />
                        <Action.Push
                          title="Edit Issue"
                          icon={Icon.Pencil}
                          shortcut={Keyboard.Shortcut.Common.Edit}
                          target={<IssueForm issue={issue} onSaved={() => revalidate()} />}
                        />
                        <Action
                          title={`Move to ${intervalTitle(other)}`}
                          icon={Icon.ArrowRight}
                          shortcut={{
                            macOS: { modifiers: ["cmd", "shift"], key: "m" },
                            Windows: { modifiers: ["ctrl", "shift"], key: "m" },
                          }}
                          onAction={() => update(issue, { interval: other }, `Moved to ${intervalTitle(other)}`)}
                        />
                        <ActionPanel.Submenu
                          title="Set Priority"
                          icon={Icon.Exclamationmark}
                          shortcut={{
                            macOS: { modifiers: ["cmd", "shift"], key: "p" },
                            Windows: { modifiers: ["ctrl", "shift"], key: "p" },
                          }}
                        >
                          {[5, 4, 3, 2, 1, 0].map((p) => (
                            <Action
                              key={p}
                              title={p ? `Priority ${p}` : "No Priority"}
                              onAction={() => update(issue, { priority: p }, "Priority updated")}
                            />
                          ))}
                        </ActionPanel.Submenu>
                        <Action.Push
                          title="Add Comment"
                          icon={Icon.Bubble}
                          shortcut={Keyboard.Shortcut.Common.Copy}
                          target={
                            <CommentForm
                              itemTitle={title}
                              onSubmit={(text) => addIssueComment(issue.id, text)}
                              onSaved={() => revalidate()}
                            />
                          }
                        />
                        {createAction}
                      </ActionPanel.Section>
                      <ActionPanel.Section>
                        <Action.CopyToClipboard
                          title="Copy Title"
                          content={title}
                          shortcut={Keyboard.Shortcut.Common.Copy}
                        />
                        <Action
                          title="Refresh"
                          icon={Icon.ArrowClockwise}
                          shortcut={Keyboard.Shortcut.Common.Refresh}
                          onAction={() => revalidate()}
                        />
                        <Action
                          title="Delete Issue"
                          icon={Icon.Trash}
                          style={Action.Style.Destructive}
                          shortcut={Keyboard.Shortcut.Common.Remove}
                          onAction={() => remove(issue)}
                        />
                      </ActionPanel.Section>
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        );
      })}
    </List>
  );
}
