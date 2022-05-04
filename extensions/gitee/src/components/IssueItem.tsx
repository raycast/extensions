import { Action, ActionPanel, Color, Icon, Image, List } from "@raycast/api";
import React from "react";
import { Issue } from "../types/issue";
import Mask = Image.Mask;
import { IssueDetail } from "./IssueDetail";

export function IssueItem(props: { issue: Issue; icon: Icon; iconColor: Color }) {
  const { issue, icon, iconColor } = props;
  return (
    <List.Item
      id={issue.id + ""}
      key={issue.id + ""}
      icon={{ source: icon, tintColor: iconColor }}
      title={issue.title}
      subtitle={"#" + issue.number}
      accessories={[
        { text: issue.updated_at.substring(0, 10) },
        { icon: { source: issue.user.avatar_url, mask: Mask.Circle } },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section title={issue.title}>
            <Action.Push title={"Show Detail"} target={<IssueDetail issue={issue} />} />
            <Action.OpenInBrowser url={issue.html_url} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
