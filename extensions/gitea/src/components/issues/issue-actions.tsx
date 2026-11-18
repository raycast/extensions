import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";
import CreateIssue from "../../issue-create";
import type { Issue, Repository } from "../../types/api";
import { IssueKindPresentation, type IssueKind } from "./issue-kind";

type IssueActionsProps = {
  item: Issue;
  kind: IssueKind;
};

export default function IssueActions({ item, kind }: IssueActionsProps) {
  const config = IssueKindPresentation[kind];

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {item.html_url ? (
          <Action.OpenInBrowser title={config.openTitle} url={item.html_url} shortcut={Keyboard.Shortcut.Common.Open} />
        ) : null}
      </ActionPanel.Section>
      <ActionPanel.Section title="Copy">
        {item.html_url ? (
          <Action.CopyToClipboard title="Copy URL" content={item.html_url} shortcut={Keyboard.Shortcut.Common.Copy} />
        ) : null}
        {item.number != null ? (
          <Action.CopyToClipboard title={config.copyNumberTitle} content={`#${item.number}`} />
        ) : null}
      </ActionPanel.Section>
      <ActionPanel.Section>
        {item.repository?.full_name ? (
          <Action.Push
            title="Create Issue"
            icon={Icon.Plus}
            shortcut={Keyboard.Shortcut.Common.New}
            target={<CreateIssue initialRepo={item.repository as Repository} />}
          />
        ) : null}
      </ActionPanel.Section>
    </ActionPanel>
  );
}
