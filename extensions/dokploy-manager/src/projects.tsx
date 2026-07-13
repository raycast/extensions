import { Action, ActionPanel, Color, Icon, List, Keyboard } from "@raycast/api";
import { DokployClient } from "./api/client";
import { AccountDropdown } from "./components/account-dropdown";
import { NoAccounts } from "./components/no-accounts";
import { ServiceListItem } from "./components/service-list-item";
import { useAccounts } from "./hooks/use-accounts";
import { ProjectNode, useProjects } from "./hooks/use-projects";
import { projectUrl } from "./lib/urls";
import { ServiceRef } from "./types/dokploy";

export default function BrowseProjects() {
  const {
    accounts,
    activeAccount,
    client,
    isLoading: accountsLoading,
    switchAccount,
    hasAccounts,
    reloadAccounts,
  } = useAccounts();
  const { data: projects, isLoading: projectsLoading, revalidate } = useProjects(client);

  if (!accountsLoading && !hasAccounts) {
    return (
      <List>
        <NoAccounts onAccountAdded={reloadAccounts} />
      </List>
    );
  }

  return (
    <List
      isLoading={accountsLoading || projectsLoading}
      searchBarPlaceholder="Search projects…"
      searchBarAccessory={
        <AccountDropdown accounts={accounts} activeAccountId={activeAccount?.id} onChange={switchAccount} />
      }
    >
      <List.EmptyView icon={Icon.Folder} title="No Projects" description="This Dokploy account has no projects yet." />

      {projects.map((project) => (
        <List.Item
          key={project.projectId}
          icon={{ source: Icon.Folder, tintColor: Color.Blue }}
          title={project.name}
          subtitle={project.description ?? undefined}
          accessories={[
            {
              text: project.serviceCount === 1 ? "1 service" : `${project.serviceCount} services`,
              icon: Icon.Layers,
            },
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Open Project"
                icon={Icon.ArrowRight}
                target={
                  client ? <ProjectServices client={client} project={project} onDidChange={revalidate} /> : <List />
                }
              />
              {client && (
                <Action.OpenInBrowser
                  title="Open in Dokploy"
                  url={projectUrl(client.webUrl, project.projectId)}
                  shortcut={Keyboard.Shortcut.Common.Open}
                />
              )}
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

interface ProjectServicesProps {
  client: DokployClient;
  project: ProjectNode;
  onDidChange: () => void;
}

/** One section per environment, because a service's identity is (project, environment, kind). */
function ProjectServices({ client, project, onDidChange }: ProjectServicesProps) {
  const hasAnyService = project.environments.some((environment) => environment.services.length > 0);

  return (
    <List navigationTitle={project.name} searchBarPlaceholder={`Search services in ${project.name}…`}>
      {!hasAnyService && (
        <List.EmptyView
          icon={Icon.Box}
          title="No Services"
          description="This project has no applications, compose stacks or databases yet."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open in Dokploy" url={projectUrl(client.webUrl, project.projectId)} />
            </ActionPanel>
          }
        />
      )}

      {project.environments.map((environment) => (
        <List.Section
          key={environment.environmentId}
          title={environment.name}
          subtitle={environment.isDefault ? "default" : undefined}
        >
          {environment.services.map((service: ServiceRef) => (
            <ServiceListItem
              key={`${service.kind}:${service.id}`}
              client={client}
              service={service}
              onDidChange={onDidChange}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
