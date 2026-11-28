import { Action, ActionPanel, Color, Icon, List, Keyboard } from "@raycast/api";
import { CreateGitHubIntegrationForm } from "./components/create-git-hub-integration-form";
import { WorkspaceDropdown } from "./components/workspace-switcher";
import { useIntegrations } from "./hooks/use-integrations";
import { useWorkspace } from "./hooks/use-workspace";
import { notraOrganizationUrl } from "./utils";

export default function Command() {
  const {
    hasMultipleWorkspaces,
    isLoading: isLoadingWorkspace,
    switchWorkspace,
    workspace,
    workspaces,
  } = useWorkspace();
  const {
    data: integrations,
    isLoading: isLoadingIntegrations,
    revalidate,
  } = useIntegrations({ execute: !isLoadingWorkspace, organizationId: workspace?.id });
  const isLoading = isLoadingWorkspace || isLoadingIntegrations;
  const integrationsUrl = notraOrganizationUrl("/integrations", workspace?.slug);

  const githubIntegrations = integrations?.github ?? [];
  const linearIntegrations = integrations?.linear ?? [];
  const hasAny = githubIntegrations.length > 0 || linearIntegrations.length > 0;

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        hasMultipleWorkspaces ? (
          <WorkspaceDropdown onChange={switchWorkspace} workspace={workspace} workspaces={workspaces} />
        ) : undefined
      }
      searchBarPlaceholder="Search integrations..."
    >
      {!(isLoading || hasAny) && (
        <List.EmptyView
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Plus}
                target={<CreateGitHubIntegrationForm onCreated={revalidate} />}
                title="Create GitHub Integration"
              />
              <Action.OpenInBrowser icon={Icon.Globe} title="View on Notra" url={integrationsUrl} />
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
                    shortcut={Keyboard.Shortcut.Common.OpenWith}
                    title="View on Notra"
                    url={integrationsUrl}
                  />
                  <Action.CopyToClipboard content={gh.displayName} title="Copy Display Name" />
                  <Action.Push
                    icon={Icon.Plus}
                    shortcut={Keyboard.Shortcut.Common.New}
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
                    shortcut={Keyboard.Shortcut.Common.OpenWith}
                    title="Manage on Notra"
                    url={integrationsUrl}
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
