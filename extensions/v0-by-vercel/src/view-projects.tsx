import { List, Detail, Icon, ActionPanel, Action, Keyboard } from "@raycast/api";
import { useProjects } from "./hooks/useProjects";
import { useState, useEffect } from "react";
import { ScopeDropdown } from "./components/ScopeDropdown";
import { useActiveProfile } from "./hooks/useActiveProfile";
import { useScopes } from "./hooks/useScopes";
import ProjectChats from "./view-projects-chats";
import CreateProjectForm from "./components/CreateProjectForm";
import CreateProjectEnvVarForm from "./components/CreateProjectEnvVarForm";
import ViewProjectEnvVars from "./components/ViewProjectEnvVars";

export default function ViewProjectsCommand() {
  const { activeProfileApiKey, activeProfileDefaultScope, isLoadingProfileDetails } = useActiveProfile();

  const [selectedScope, setSelectedScope] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedScope && activeProfileDefaultScope !== null && !isLoadingProfileDetails) {
      setSelectedScope(activeProfileDefaultScope);
    }
  }, [activeProfileDefaultScope, selectedScope, isLoadingProfileDetails]);

  const { projects, isLoadingProjects, projectError, revalidateProjects } = useProjects(selectedScope);

  const { scopes: scopesData, isLoadingScopes } = useScopes(activeProfileApiKey); // Use useScopes hook

  if (projectError) {
    return <Detail markdown={`Error: ${projectError.message}`} />;
  }

  if (isLoadingProjects || isLoadingProfileDetails || isLoadingScopes) {
    return (
      <List navigationTitle="v0 Projects">
        <List.EmptyView title="Loading..." description="Fetching your projects..." />
      </List>
    );
  }

  return (
    <List
      navigationTitle="v0 Projects"
      searchBarPlaceholder="Search projects..."
      searchBarAccessory={
        <ScopeDropdown
          selectedScope={selectedScope}
          onScopeChange={setSelectedScope}
          availableScopes={scopesData || []}
          isLoadingScopes={isLoadingScopes}
        />
      }
    >
      {projects.map((project) => (
        <List.Item
          key={project.id}
          icon={Icon.Folder}
          title={project.name}
          actions={
            <ActionPanel>
              <Action.Push title="View Chats" icon={Icon.Message} target={<ProjectChats projectId={project.id} />} />
              <Action.OpenInBrowser
                icon={Icon.Globe}
                title="View in Browser"
                shortcut={Keyboard.Shortcut.Common.Open}
                url={`https://v0.dev/chat/projects/${project.id}`}
              />
              <Action.Push
                title="Add Environment Variable"
                icon={Icon.PlusCircle}
                target={<CreateProjectEnvVarForm projectId={project.id} />}
                shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
              />
              <Action.Push
                title="View Environment Variables"
                icon={Icon.Eye}
                target={<ViewProjectEnvVars projectId={project.id} />}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
              />
              <Action.CopyToClipboard
                title="Copy Project ID"
                content={project.id}
                icon={Icon.Clipboard}
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
              <Action.Push
                title="Create New Project"
                icon={Icon.NewFolder}
                target={<CreateProjectForm onProjectCreated={revalidateProjects} />}
                shortcut={Keyboard.Shortcut.Common.New}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
