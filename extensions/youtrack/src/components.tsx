import { useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  List,
  Icon,
  Color,
  Detail,
  Image,
  Toast,
  showToast,
  useNavigation,
  confirmAlert,
  Alert,
} from "@raycast/api";
import type { Command, CommandSuggestions, Comment, EnumValue, Issue, IssueExtended, WorkItem } from "./interfaces";
import { isURL, issueStates, addMarkdownImages, getPriorityFieldValue, formatDate } from "./utils";
import { AddWork } from "./work-item";
import { ApplyCommand } from "./apply-command";

const resolvedIcon = { source: Icon.Check, tintColor: Color.Green };
const openIcon = { source: Icon.Dot };

export function IssueListItem(props: {
  item: Issue;
  index: number;
  instance: string;
  resolved: boolean;
  getIssueDetailsCb: () => Promise<IssueExtended | void>;
  createWorkItemCb: (workItem: WorkItem) => Promise<WorkItem | void>;
  applyCommandCb: (command: Command) => Promise<void>;
  getCommandSuggestions: (command: string) => Promise<CommandSuggestions>;
  getLastCommentCb: () => Promise<Comment | null>;
  deleteIssueCb: () => Promise<void>;
}) {
  const [state, setState] = useState<{ icon: Image; accessories: List.Item.Accessory[] }>({
    icon: { source: "" },
    accessories: [],
  });

  const priorityFieldValue = getPriorityFieldValue(props.item.customFields);
  const stateField = props.item.customFields.find((field) => field.name === "State");

  useEffect(() => {
    const icon = props.resolved ? resolvedIcon : openIcon;
    const tooltip = props.resolved ? issueStates.ISSUE_RESOLVED : issueStates.ISSUE_OPEN;
    const accessories = priorityFieldValue
      ? [
          {
            tag: {
              value: priorityFieldValue.name[0],
              color: priorityFieldValue.color?.background ?? "",
              tooltip: priorityFieldValue.name,
            },
          },
          { text: props.item.id, tooltip },
        ]
      : [{ text: props.item.id, tooltip }];
    setState({ icon, accessories });
  }, [priorityFieldValue, props.item.id, props.resolved]);

  return (
    <List.Item
      icon={state.icon}
      title={props.item.summary}
      keywords={[props.item.id]}
      subtitle={{
        tooltip: stateField && stateField.value ? (stateField.value as EnumValue).name : "",
        value: props.item.date,
      }}
      accessories={state.accessories}
      actions={
        <Actions
          item={props.item}
          instance={props.instance}
          getIssueDetailsCb={props.getIssueDetailsCb}
          createWorkItemCb={props.createWorkItemCb}
          applyCommandCb={props.applyCommandCb}
          getCommandSuggestions={props.getCommandSuggestions}
          getLastCommentCb={props.getLastCommentCb}
          deleteIssueCb={props.deleteIssueCb}
        />
      }
    />
  );
}

function IssueDetails(props: {
  getIssueDetailsCb: () => Promise<IssueExtended | void>;
  createWorkItemCb: (workItem: WorkItem) => Promise<WorkItem | void>;
  applyCommandCb: (command: Command) => Promise<void>;
  getCommandSuggestions: (command: string) => Promise<CommandSuggestions>;
  getLastCommentCb: () => Promise<Comment | null>;
  link: string;
  instance: string;
}) {
  const [issue, setIssue] = useState<IssueExtended | null>(null);
  const { getIssueDetailsCb } = props;
  useEffect(() => {
    async function fetchIssueDetails() {
      const issue = await getIssueDetailsCb();
      if (issue) {
        setIssue(issue);
      }
    }
    fetchIssueDetails();
  }, [getIssueDetailsCb]);

  if (!issue) {
    return <Detail isLoading />;
  }

  const issueBody = `## ${issue.summary}\n\n${addMarkdownImages(issue, props.instance)}`;

  const renderCustomFields = () => {
    return issue.customFields.map((field) => {
      if (typeof field.value === "string" || typeof field.value === "number") {
        return <Detail.Metadata.Label key={field.id} title={field.name} text={String(field.value)} />;
      }
      return <Detail.Metadata.Label key={field.id} title={field.name} text={field.value.name} />;
    });
  };

  return (
    <Detail
      markdown={issueBody}
      navigationTitle={`${issue.id}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Created" text={issue.created} />
          {issue.assignee ? (
            <Detail.Metadata.Label
              title="Assignee"
              text={issue.assignee?.fullName}
              icon={{
                source: isURL(issue.assignee.avatarUrl ?? "")
                  ? issue.assignee.avatarUrl
                  : `${props.instance}${issue.assignee.avatarUrl}`,
                mask: Image.Mask.RoundedRectangle,
              }}
            />
          ) : null}
          {issue.reporter ? (
            <Detail.Metadata.Label
              title="Author"
              text={issue.reporter?.fullName}
              icon={{
                source: isURL(issue.reporter.avatarUrl ?? "")
                  ? issue.reporter.avatarUrl
                  : `${props.instance}${issue.reporter.avatarUrl}`,
                mask: Image.Mask.RoundedRectangle,
              }}
            />
          ) : null}
          <Detail.Metadata.Label title="Updated" text={issue.date} />
          {issue.updater ? (
            <Detail.Metadata.Label
              title="Updater"
              text={issue.updater?.fullName}
              icon={{
                source: isURL(issue.updater.avatarUrl ?? "")
                  ? issue.updater.avatarUrl
                  : `${props.instance}${issue.updater.avatarUrl}`,
                mask: Image.Mask.RoundedRectangle,
              }}
            />
          ) : null}
          {issue.tags.length ? (
            <Detail.Metadata.TagList title="Tags">
              {issue.tags.map((tag) => (
                <Detail.Metadata.TagList.Item key={tag.id} text={tag.name} color={tag.color.background} />
              ))}
            </Detail.Metadata.TagList>
          ) : null}
          {renderCustomFields()}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel title={issue.id}>
          <ActionPanel.Section>
            <Action.OpenInBrowser url={props.link} />
            <Action.CopyToClipboard content={issue.id} title="Copy ID" />
            <Action.CopyToClipboard
              content={props.link}
              title="Copy Link"
              shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
            />
            <Action.Push
              icon={Icon.Clock}
              title="Add Work"
              shortcut={{ modifiers: ["cmd"], key: "t" }}
              target={
                <AddWork
                  link={props.link}
                  instance={props.instance}
                  getIssueDetailsCb={() => props.getIssueDetailsCb()}
                  createWorkItemCb={(workItem) => props.createWorkItemCb(workItem)}
                />
              }
            />
            <Action.Push
              title="Apply Command"
              icon={Icon.Terminal}
              target={
                <ApplyCommand
                  link={props.link}
                  instance={props.instance}
                  issue={issue}
                  getIssueDetailsCb={props.getIssueDetailsCb}
                  applyCommandCb={(command) => props.applyCommandCb(command)}
                  getCommandSuggestions={(command) => props.getCommandSuggestions(command)}
                />
              }
              shortcut={{ modifiers: ["cmd", "shift"], key: "k" }}
            />
            <Action.Push
              title="Show Last Comment"
              icon={Icon.Text}
              target={
                <CommentDetails
                  getLastCommentCb={props.getLastCommentCb}
                  instance={props.instance}
                  issueId={issue.id}
                />
              }
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function Actions(props: {
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

        <Action.CopyToClipboard content={props.item.id} title="Copy ID" />

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

function CommentDetails(props: { getLastCommentCb: () => Promise<Comment | null>; instance: string; issueId: string }) {
  const [comment, setComment] = useState<Comment | null | undefined>(undefined);
  const { pop } = useNavigation();
  const { getLastCommentCb } = props;

  useEffect(() => {
    async function fetchComment() {
      const comment = await getLastCommentCb();

      setComment(comment);
    }
    fetchComment();
  }, [getLastCommentCb]);

  if (comment === undefined) {
    return <Detail isLoading />;
  }

  if (comment === null) {
    showToast({
      style: Toast.Style.Failure,
      title: "No comments yet",
    });
    pop();
    return;
  }

  return (
    <Detail
      markdown={addMarkdownImages(comment, props.instance)}
      navigationTitle={`By ${comment.author?.fullName} on ${formatDate(comment.created)}`}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            content={`${props.instance}/issue/${props.issueId}#focus=Comments-${comment.id}.0-0`}
            title="Copy Link"
          />
          <Action.OpenInBrowser url={`${props.instance}/issue/${props.issueId}#focus=Comments-${comment.id}.0-0`} />
        </ActionPanel>
      }
    />
  );
}
