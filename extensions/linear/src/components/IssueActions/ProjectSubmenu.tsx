import { Action, ActionPanel } from "@raycast/api";
import { useState } from "react";

import { IssueResult } from "../../api/getIssues";
import { ProjectResult } from "../../api/getProjects";
import { getProjectIcon } from "../../helpers/projects";
import useProjects from "../../hooks/useProjects";

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
        <Action title="Loading…" />
      ) : (
        (projects || []).map((project) => (
          <Action
            key={project.id}
            autoFocus={project.id === issue.project?.id}
            title={`${project.name} (${project.status.name})`}
            icon={getProjectIcon(project)}
            onAction={() => setProject(project)}
          />
        ))
      )}
    </ActionPanel.Submenu>
  );
}
