import { environment, launchCommand, LaunchType, List, LocalStorage } from "@raycast/api";
import { createContext, useContext } from "react";
import type { Context } from "./common";
import type { Project } from "../lib/revenuecat";

export const SELECTED_PROJECT_KEY = "selectedProjectId";
export const ProjectContext = createContext<{ projects: Project[]; selected: string } | undefined>(undefined);

async function selectProject(id: string, selected: string, command?: string) {
  if (id === selected) return;
  await LocalStorage.setItem(SELECTED_PROJECT_KEY, id);
  await launchCommand({ name: command || environment.commandName, type: LaunchType.UserInitiated });
}

export function ProjectDropdown({ command, context: view }: { command?: string; context?: Context }) {
  const shared = useContext(ProjectContext);
  const context = view?.projects ? { projects: view.projects, selected: view.project.id } : shared;
  return (
    <List.Dropdown
      tooltip="Switch Project"
      value={context?.selected || ""}
      onChange={(id) => selectProject(id, context?.selected || "", command)}
    >
      {(context?.projects || []).map((project) => (
        <List.Dropdown.Item
          key={project.id}
          value={project.id}
          title={project.name}
          icon={project.icon_url || "revenuecat-icon.png"}
        />
      ))}
    </List.Dropdown>
  );
}
