import { useState, useEffect } from "react";
import { List } from "@raycast/api";

import { Project } from "../types";
import { ProjectListItem } from "./ProjectListItem";
import { fetchProjects } from "../api";

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

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter projects by name..." isShowingDetail={false}>
      {projects.map((project, index) => (
        <ProjectListItem key={index} project={project} />
      ))}
    </List>
  );
};
