import { Action, ActionPanel, Icon, confirmAlert, Alert } from "@raycast/api";
import type { Command, CommandSuggestions, Comment, Issue, IssueExtended, WorkItem } from "../interfaces";
import { AddWork } from "../work-item";
import { ApplyCommand } from "../apply-command";
import { IssueDetails } from "./IssueDetails";
import { CommentDetails } from "./CommentDetails";

export function Actions(props: {
  item: Issue;
  instance: string;
  getIssueDetailsCb: () => Promise<IssueExtended | void>;
  createWorkItemCb: (workItem: WorkItem) => Promise<WorkItem | void>;
  applyCommandCb: (command: Command) => Promise<void>;
  getCommandSuggestions: (command: string) => Promise<CommandSuggestions>;
  getLastCommentCb: () => Promise<Comment | null>;
  deleteIssueCb: () => Promise<void>;
}) {
  const link = `${props.instance}/issue/${props.item.id}`;
  return (
    <ActionPanel title={props.item.summary}>
      <ActionPanel.Section>
        <Action.Push
          icon={Icon.AppWindowSidebarRight}
          title="Show Details"
          target={
            <IssueDetails
              link={link}
              instance={props.instance}
              getIssueDetailsCb={() => props.getIssueDetailsCb()}
              createWorkItemCb={(workItem) => props.createWorkItemCb(workItem)}
              applyCommandCb={(command) => props.applyCommandCb(command)}
              getCommandSuggestions={(command) => props.getCommandSuggestions(command)}
              getLastCommentCb={props.getLastCommentCb}
            />
          }
        />
        <Action.CopyToClipboard content={props.item.id} title="Copy ID" />

        <Action.Push
          icon={Icon.Clock}
          title="Add Work"
          shortcut={{ modifiers: ["cmd"], key: "t" }}
          target={
            <AddWork
              link={link}
              instance={props.instance}
              getIssueDetailsCb={props.getIssueDetailsCb}
              createWorkItemCb={(workItem) => props.createWorkItemCb(workItem)}
            />
          }
        />

        <Action.CopyToClipboard
          content={link}
          title="Copy Link"
          shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
        />

        <Action.OpenInBrowser url={link} shortcut={{ modifiers: ["opt"], key: "enter" }} />

        <Action.Push
          title="Apply Command"
          icon={Icon.Terminal}
          target={
            <ApplyCommand
              link={link}
              instance={props.instance}
              issue={props.item}
              getIssueDetailsCb={props.getIssueDetailsCb}
              applyCommandCb={(command) => props.applyCommandCb(command)}
              getCommandSuggestions={(command) => props.getCommandSuggestions(command)}
            />
          }
          shortcut={{ modifiers: ["cmd", "shift"], key: "k" }}
        />
        <Action.Push
          title="Show Last Comment"
          icon={Icon.SpeechBubbleActive}
          target={
            <CommentDetails
              getLastCommentCb={props.getLastCommentCb}
              instance={props.instance}
              issueId={props.item.id}
            />
          }
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        />
        <Action
          title="Delete Issue"
          style={Action.Style.Destructive}
          icon={Icon.Trash}
          shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
          onAction={() => {
            confirmAlert({
              title: "Delete Issue",
              message: "Are you sure you want to delete this issue?",
              primaryAction: {
                title: "Delete",
                onAction: props.deleteIssueCb,
                style: Alert.ActionStyle.Destructive,
              },
            });
          }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
