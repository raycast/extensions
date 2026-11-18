import { Action, ActionPanel, Detail } from "@raycast/api";

import { ExtendedRepositoryFieldsFragment } from "../generated/graphql";
import { useReadme } from "../hooks/useRepositories";

export default function RepositoryReadme({ repository }: { repository: ExtendedRepositoryFieldsFragment }) {
  const { data, isLoading } = useReadme(repository);

  const markdown =
    data && !data.found
      ? `# ${repository.nameWithOwner}\n\n> This repository doesn't have a README.`
      : (data?.markdown ?? "");

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`${repository.nameWithOwner} · README`}
      markdown={markdown}
      actions={
        <ActionPanel title={repository.nameWithOwner}>
          <Action.OpenInBrowser url={repository.url} />
          <Action.CopyToClipboard content={repository.url} title="Copy Repository URL" />
        </ActionPanel>
      }
    />
  );
}
