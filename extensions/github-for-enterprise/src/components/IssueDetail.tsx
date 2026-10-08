import { ActionPanel, Color, Detail, Action, Clipboard, Icon } from "@raycast/api";
import CloseIssue from "./CloseIssue";
import { IssueOwnProps } from "./Issue";
import ReopenIssue from "./ReopenIssue";

type IssueDetailOwnProps = Omit<IssueOwnProps, "avatarUrl" | "createdAt">;

export default function IssueDetail(props: IssueDetailOwnProps) {
  const { body, id, number, repository, title, state, url } = props;

  return (
    <Detail
      markdown={body || "No description provided"}
      navigationTitle={title}
      actions={
        <ActionPanel title={`#${number} in ${repository.nameWithOwner}`}>
          <ActionPanel.Section>
            <Action.OpenInBrowser url={url} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Copy Issue Number"
              icon={{
                source: Icon.Clipboard,
                tintColor: Color.PrimaryText,
              }}
              onAction={() => Clipboard.copy(`${number}`)}
            />
            <Action
              title="Copy Issue URL"
              icon={{
                source: Icon.Clipboard,
                tintColor: Color.PrimaryText,
              }}
              onAction={() => Clipboard.copy(url)}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            {state === "OPEN" ? (
              <CloseIssue id={id} number={number} shouldPop />
            ) : (
              <ReopenIssue id={id} number={number} />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
