import { useEffect, useState } from "react";
import { Action, ActionPanel, Detail, Icon, Image } from "@raycast/api";
import type { Command, CommandSuggestions, Comment, IssueExtended, WorkItem } from "../interfaces";
import { addMarkdownImages } from "../utils";
import { AddWork } from "../work-item";
import { ApplyCommand } from "../apply-command";
import { CommentDetails } from "./CommentDetails";

export function IssueDetails(props: {
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
                source: issue.assignee.avatarUrl,
                mask: Image.Mask.RoundedRectangle,
              }}
            />
          ) : null}
          {issue.reporter ? (
            <Detail.Metadata.Label
              title="Author"
              text={issue.reporter?.fullName}
              icon={{
                source: issue.reporter.avatarUrl,
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
                source: issue.updater.avatarUrl,
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
              icon={Icon.SpeechBubbleActive}
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
