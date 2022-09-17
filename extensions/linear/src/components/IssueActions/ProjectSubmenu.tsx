import { Action, ActionPanel } from "@raycast/api";
import { useState } from "react";

import { IssueResult } from "../../api/getIssues";
import { ProjectResult } from "../../api/getProjects";

import useProjects from "../../hooks/useProjects";

import { projectStatusText } from "../../helpers/projects";

import { UpdateIssueParams } from "./IssueActions";

export default function ProjectSubmenu({
  issue,
  updateIssue,
}: {
  issue: IssueResult;
  updateIssue: (params: UpdateIssueParams) => void;
}) {
  const [load, setLoad] = useState(false);
  const { projects, isLoadingProjects } = useProjects(issue.team.id, { execute: load });

  async function setProject(project: ProjectResult | null) {
    const currentProject = issue.project;
    updateIssue({
      animatedTitle: "Setting project",
      payload: { projectId: project ? project.id : null },
      optimisticUpdate(issue) {
        return {
          ...issue,
          project: project || undefined,
        };
      },
      rollbackUpdate(issue) {
        return {
          ...issue,
          project: currentProject,
        };
      },
      successTitle: project ? "Set project" : `Removed project from ${issue.identifier}`,
      successMessage: project ? `"${project.name}" added to ${issue.identifier}` : "",
      errorTitle: "Failed to set project",
    });
  }

  return (
    <ActionPanel.Submenu
      title="Set Project"
      icon={{ source: { light: "light/project.svg", dark: "dark/project.svg" } }}
      shortcut={{ modifiers: ["ctrl", "shift"], key: "p" }}
      onOpen={() => setLoad(true)}
    >
      <Action
        title="No Project"
        icon={{ source: { light: "light/no-project.svg", dark: "dark/no-project.svg" } }}
        onAction={() => setProject(null)}
      />

      {!projects && isLoadingProjects ? (
        <Action title="Loading..." />
      ) : (
        (projects || []).map((project) => (
          <Action
            key={project.id}
            title={`${project.name} (${projectStatusText[project.state]})`}
            icon={{
              source: project.icon || { light: "light/project.svg", dark: "dark/project.svg" },
              tintColor: project.color,
            }}
            onAction={() => setProject(project)}
          />
        ))
      )}
    </ActionPanel.Submenu>
  );
}
