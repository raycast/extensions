import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { CreateGitHubIntegrationForm } from "./components/create-git-hub-integration-form";
import { useIntegrations } from "./hooks/use-integrations";
import { notraUrl } from "./utils";

export default function Command() {
  const { data: integrations, isLoading, revalidate } = useIntegrations();

  const githubIntegrations = integrations?.github ?? [];
  const linearIntegrations = integrations?.linear ?? [];
  const hasAny = githubIntegrations.length > 0 || linearIntegrations.length > 0;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search integrations...">
      {!(isLoading || hasAny) && (
        <List.EmptyView
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Plus}
                target={<CreateGitHubIntegrationForm onCreated={revalidate} />}
                title="Create GitHub Integration"
              />
              <Action.OpenInBrowser icon={Icon.Globe} title="View on Notra" url={notraUrl("/settings/integrations")} />
            </ActionPanel>
          }
          description="Add a GitHub repository to get started."
          title="No Integrations"
        />
      )}

      {githubIntegrations.length > 0 && (
        <List.Section subtitle={`${githubIntegrations.length}`} title="GitHub">
          {githubIntegrations.map((gh) => (
            <List.Item
              accessories={[{ tag: { value: "GitHub", color: Color.Purple } }]}
              actions={
                <ActionPanel>
                  {gh.owner && gh.repo && (
                    <Action.OpenInBrowser title="Open on GitHub" url={`https://github.com/${gh.owner}/${gh.repo}`} />
                  )}
                  <Action.OpenInBrowser
                    icon={Icon.Globe}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                    title="View on Notra"
                    url={notraUrl("/settings/integrations")}
                  />
                  <Action.CopyToClipboard content={gh.displayName} title="Copy Display Name" />
                  <Action.Push
                    icon={Icon.Plus}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                    target={<CreateGitHubIntegrationForm onCreated={revalidate} />}
                    title="Create GitHub Integration"
                  />
                </ActionPanel>
              }
              icon={Icon.Code}
              key={gh.id}
              subtitle={gh.defaultBranch ? `Branch: ${gh.defaultBranch}` : undefined}
              title={gh.displayName}
            />
          ))}
        </List.Section>
      )}

      {linearIntegrations.length > 0 && (
        <List.Section subtitle={`${linearIntegrations.length}`} title="Linear">
          {linearIntegrations.map((ln) => (
            <List.Item
              accessories={[{ tag: { value: "Linear", color: Color.Blue } }]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    icon={Icon.Globe}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                    title="Manage on Notra"
                    url={notraUrl("/settings/integrations")}
                  />
                  <Action.CopyToClipboard content={ln.displayName} title="Copy Display Name" />
                </ActionPanel>
              }
              icon={Icon.List}
              key={ln.id}
              subtitle={ln.linearTeamName ?? ln.linearOrganizationName ?? undefined}
              title={ln.displayName}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
