import { useState, useEffect } from "react";
import { List } from "@raycast/api";

import { Project } from "../types";
import { ProjectListItem } from "./ProjectListItem";
import { fetchProjects } from "../api";
import { getStatus } from "../../utils/storage";

export const ProjectList = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshItems = async () => {
    setIsLoading(true);
    setProjects(await fetchProjects());
    setIsLoading(false);
  };

  useEffect(() => {
    refreshItems();
  }, []);

  function updateProject(index: number, newValue: Project): void {
    const updatedProjects = [...projects];
    updatedProjects[index] = newValue;
    setProjects(updatedProjects);
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter projects by name..." isShowingDetail={false}>
      {projects.map((project, index) => (
        <ProjectListItem key={index} index={index} project={project} updateProject={updateProject} />
      ))}
    </List>
  );
};
