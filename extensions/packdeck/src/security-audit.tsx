import { Action, ActionPanel, Icon, List, openExtensionPreferences } from "@raycast/api";
import { useMemo, useState } from "react";
import { AddProjectForm } from "./components/AddProjectForm";
import { ProjectAuditList } from "./components/ProjectAuditList";
import { PACKAGE_MANAGER_META } from "./lib/constants";
import { useProjects } from "./lib/useProjects";

export default function SecurityAuditCommand() {
  const { projects, activeProject, selectActiveProject, isLoading, revalidate } = useProjects();
  const [selectedPath, setSelectedPath] = useState<string>("");

  const currentProject = useMemo(() => {
    if (selectedPath) {
      const match = projects.find((p) => p.path === selectedPath);
      if (match) return match;
    }
    return activeProject;
  }, [projects, selectedPath, activeProject]);

  if (!isLoading && !currentProject) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Shield}
          title="No Projects Found"
          description="Add a local project containing package.json to run a security audit."
          actions={
            <ActionPanel>
              <Action.Push
                title="Add Local Project…"
                icon={Icon.Plus}
                target={<AddProjectForm onAdded={revalidate} />}
              />
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (!currentProject) {
    return <List isLoading />;
  }

  const projectDropdown = (
    <List.Dropdown
      tooltip="Select Project to Audit"
      value={currentProject.path}
      onChange={async (val) => {
        setSelectedPath(val);
        await selectActiveProject(val);
      }}
    >
      {projects.map((p) => (
        <List.Dropdown.Item
          key={p.path}
          value={p.path}
          title={`${p.name} (${PACKAGE_MANAGER_META[p.packageManager].label})`}
          icon={p.isPinned ? Icon.Pin : Icon.Folder}
        />
      ))}
    </List.Dropdown>
  );

  return <ProjectAuditList key={currentProject.path} project={currentProject} searchBarAccessory={projectDropdown} />;
}
