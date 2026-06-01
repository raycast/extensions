import { Action, ActionPanel, Icon, List } from "@raycast/api";

import { type Issue } from "../api/issues";
import { getIssueUrl } from "../helpers/urls";

import IssueDetail from "./IssueDetail";

export default function IssueLinkedIssues({ issue }: { issue: Issue }) {
  const links = issue.fields.issuelinks ?? [];

  return (
    <List navigationTitle={`Linked Issues — ${issue.key}`}>
      {links.length === 0 ? (
        <List.EmptyView title="No linked issues" description="This issue has no issue links." />
      ) : (
        links.map((link) => {
          const linked = link.inwardIssue ?? link.outwardIssue;
          const direction = link.inwardIssue ? link.type.inward : link.type.outward;

          if (!linked) return null;

          return (
            <List.Item
              key={link.id}
              icon={{ value: linked.fields.issuetype.iconUrl, tooltip: linked.fields.issuetype.name }}
              title={linked.fields.summary}
              subtitle={linked.key}
              accessories={[{ tag: direction }, { text: linked.fields.status.name }]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Show Details"
                    icon={Icon.Sidebar}
                    target={<IssueDetail initialIssue={linked} issueKey={linked.key} />}
                  />
                  <Action.OpenInBrowser url={getIssueUrl(linked.key)} title="Open in Browser" />
                  <Action.CopyToClipboard title="Copy Issue Key" content={linked.key} />
                  <Action.CopyToClipboard title="Copy Issue URL" content={getIssueUrl(linked.key)} />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
