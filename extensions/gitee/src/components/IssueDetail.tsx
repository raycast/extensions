import { Action, ActionPanel, Detail } from "@raycast/api";
import { isEmpty } from "../utils/common-utils";
import React from "react";
import { Issue } from "../types/issue";

export function IssueDetail(props: { issue: Issue }) {
  const { issue } = props;

  return (
    <Detail
      navigationTitle={issue.title}
      markdown={issue.title + "\n ------ \n" + issue.body}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Link title={"Number"} text={"#" + issue.number} target={issue.html_url} />
          <Detail.Metadata.Link title={"Owner"} text={issue.user.name} target={issue.user.html_url} />
          {!isEmpty(issue.assignee?.name) && (
            <Detail.Metadata.Link
              title={"assignee"}
              text={issue.assignee?.name + ""}
              target={issue.assignee?.html_url + ""}
            />
          )}
          <Detail.Metadata.Link title={"Repository"} text={issue.repository.human_name} target={issue.repository_url} />
          <Detail.Metadata.Label title={"Comments"} text={issue.comments + ""} />
          <Detail.Metadata.Label title={"State"} text={issue.state} />
          <Detail.Metadata.Label title={"Last Update"} text={issue.updated_at.substring(0, 10)} />

          {issue.labels.length !== 0 && (
            <Detail.Metadata.TagList title="Labels">
              {issue.labels.map((label) => {
                return <Detail.Metadata.TagList.Item text={label.name} color={"#" + label.color} />;
              })}
            </Detail.Metadata.TagList>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={issue.html_url} />
        </ActionPanel>
      }
    />
  );
}
