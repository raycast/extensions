import {
  ActionPanel,
  Color,
  copyTextToClipboard,
  ImageMask,
  List,
  OpenInBrowserAction,
  PushAction,
} from "@raycast/api";
import { format } from "timeago.js";
import React from "react";
import CloseIssue from "./CloseIssue";
import ReopenIssue from "./ReopenIssue";
import IssueDetail from "./IssueDetail";

export type IssueOwnProps = {
  body: string;
  createdAt: string;
  id: string;
  number: number;
  author: {
    avatarUrl: string;
  };
  repository: {
    nameWithOwner: string;
  };
  state: string;
  title: string;
  url: string;
};

export default function Issue(props: IssueOwnProps) {
  const { author, createdAt, id, number, repository, state, title, url } = props;

  return (
    <List.Item
      key={id}
      title={title}
      subtitle={`#${number} in ${repository.nameWithOwner}`}
      icon={{
        source: state === "OPEN" ? "issue-open.png" : "issue-closed.png",
        tintColor: state === "OPEN" ? Color.Green : Color.Red,
      }}
      accessoryTitle={format(createdAt)}
      accessoryIcon={{
        source: author.avatarUrl,
        mask: ImageMask.Circle,
      }}
      actions={
        <ActionPanel title={`#${number} in ${repository.nameWithOwner}`}>
          <ActionPanel.Section>
            <PushAction
              title="Show Details"
              target={<IssueDetail {...props} />}
              icon={{
                source: "sidebar-right-16",
                tintColor: Color.PrimaryText,
              }}
            />
            <OpenInBrowserAction url={url} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <ActionPanel.Item
              title="Copy Issue Number"
              icon={{
                source: "doc-on-clipboard-16",
                tintColor: Color.PrimaryText,
              }}
              onAction={() => copyTextToClipboard(`${number}`)}
            />
            <ActionPanel.Item
              title="Copy Issue URL"
              icon={{
                source: "doc-on-clipboard-16",
                tintColor: Color.PrimaryText,
              }}
              onAction={() => copyTextToClipboard(url)}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            {state === "OPEN" ? <CloseIssue id={id} number={number} /> : <ReopenIssue id={id} number={number} />}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
