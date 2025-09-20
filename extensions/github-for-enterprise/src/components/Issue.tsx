import { ActionPanel, Color, List, Action, Clipboard, Image } from "@raycast/api";
import { format } from "timeago.js";
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
      actions={
        <ActionPanel title={`#${number} in ${repository.nameWithOwner}`}>
          <ActionPanel.Section>
            <Action.Push
              title="Show Details"
              target={<IssueDetail {...props} />}
              icon={{
                source: "sidebar-right-16",
                tintColor: Color.PrimaryText,
              }}
            />
            <Action.OpenInBrowser url={url} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Copy Issue Number"
              icon={{
                source: "doc-on-clipboard-16",
                tintColor: Color.PrimaryText,
              }}
              onAction={() => Clipboard.copy(`${number}`)}
            />
            <Action
              title="Copy Issue URL"
              icon={{
                source: "doc-on-clipboard-16",
                tintColor: Color.PrimaryText,
              }}
              onAction={() => Clipboard.copy(url)}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            {state === "OPEN" ? <CloseIssue id={id} number={number} /> : <ReopenIssue id={id} number={number} />}
          </ActionPanel.Section>
        </ActionPanel>
      }
      accessories={[
        {
          text: format(createdAt),

          icon: {
            source: author.avatarUrl,
            mask: Image.Mask.Circle,
          },
        },
      ]}
    />
  );
}
