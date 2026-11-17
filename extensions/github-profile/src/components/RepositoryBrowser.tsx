import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { GitHubRepository } from "../api/github";

export function RepositoryBrowser({ repositories }: { repositories: GitHubRepository[] }) {
  return (
    <List navigationTitle="Recently Updated Repositories" searchBarPlaceholder="Search these repositories…">
      <List.EmptyView title="No Repositories Found" description="Try another search or refresh the profile." />
      {repositories.map((repository) => (
        <List.Item
          key={repository.id}
          icon={{ source: Icon.Code, tintColor: Color.Green }}
          title={repository.name}
          subtitle={repository.description || undefined}
          keywords={[repository.language || "", repository.description || ""]}
          accessories={[
            ...(repository.language ? [{ tag: repository.language, tooltip: "Language" }] : []),
            {
              icon: { source: Icon.Star, tintColor: Color.Yellow },
              text: String(repository.stargazers_count ?? 0),
              tooltip: "Stars",
            },
            ...(repository.updated_at ? [{ date: new Date(repository.updated_at), tooltip: "Last updated" }] : []),
          ]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open Repository" url={repository.html_url} />
              <Action.CopyToClipboard title="Copy Clone URL" content={`${repository.html_url}.git`} />
              <Action.CopyToClipboard title="Copy Repository URL" content={repository.html_url} />
              <Action.OpenInBrowser title="Open Issues" url={`${repository.html_url}/issues`} />
              <Action.OpenInBrowser title="Open Pull Requests" url={`${repository.html_url}/pulls`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
