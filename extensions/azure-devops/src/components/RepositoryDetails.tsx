import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { GitRepository } from "azure-devops-node-api/interfaces/GitInterfaces";
import html2md from "html-to-md";
import PullRequestsList from "./PullRequestsList";

export default function RepositoryDetails(props: { repository: GitRepository }) {
  const { repository } = props;

  function getMarkdown(): string {
    const title = `<h2>${repository.name}</h2> <hr/>`;
    const body = `HTTPS: ${repository.remoteUrl} `;

    return html2md(title + body);
  }

  return (
    <Detail
      markdown={getMarkdown()}
      navigationTitle={repository.name}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Id" text={repository?.id} />
          <Detail.Metadata.Label title="Project" text={repository.project?.name} />
          <Detail.Metadata.Label title="Default Branch" text={repository.defaultBranch} />
          <Detail.Metadata.Label title="Size" text={repository.size?.toString()} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel title="Quick actions">
          <ActionPanel.Section>
            <Action.OpenInBrowser url={repository.webUrl!} />
            <Action.Push
              title="Pull Requests"
              icon={Icon.List}
              target={<PullRequestsList repositotyId={repository.id} />}
            />
            <Action.CopyToClipboard title="Copy HTTPS URL" content={repository.remoteUrl!} />
            <Action.CopyToClipboard title="Copy SSH URL" content={repository.sshUrl!} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
