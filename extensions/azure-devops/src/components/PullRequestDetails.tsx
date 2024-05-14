import { Action, ActionPanel, Detail } from "@raycast/api";
import { GitPullRequest, PullRequestAsyncStatus } from "azure-devops-node-api/interfaces/GitInterfaces";
import html2md from "html-to-md";

export default function PullRequestDetails(props: { pr: GitPullRequest; webUrl: string }) {
  const { pr, webUrl } = props;

  function getMarkdown(): string {
    const title = `<h2>${pr.title}</h2> <hr/>`;
    const description = pr.description ?? "";

    return html2md(title + description);
  }

  return (
    <Detail
      markdown={getMarkdown()}
      navigationTitle={pr.title}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Id" text={pr.pullRequestId?.toString()} />
          <Detail.Metadata.Label title="Merge Status" text={PullRequestAsyncStatus[pr.mergeStatus!]} />
          <Detail.Metadata.Label title="Source Branch" text={pr.sourceRefName} />
          <Detail.Metadata.Label title="Target Branch" text={pr.targetRefName} />
          <Detail.Metadata.Label title="Created by" text={pr.createdBy?.displayName} />
          <Detail.Metadata.Label title="Created at" text={pr.creationDate?.toISOString()} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel title="Quick actions">
          <ActionPanel.Section>
            <Action.OpenInBrowser url={webUrl} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
