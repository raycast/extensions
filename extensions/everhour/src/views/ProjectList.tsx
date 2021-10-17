import { useState, useEffect } from "react";
import { List, Icon, showToast, ToastStyle } from "@raycast/api";
import { ProjectListItem } from "../components";
import { getProjects } from "../api";
import { Project } from "../types";

export function ProjectList() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetch() {
      try {
        const projectsResp = await getProjects();
        setProjects(projectsResp);
        setIsLoading(false);
      } catch (error) {
        const message = (error as { message: string }).message;
        await showToast(ToastStyle.Failure, message || "Failed to fetch projects");
        setIsLoading(false);
      }
    }
    fetch();
  }, []);

  const renderProjects = () => {
    if (!isLoading && projects[0]) {
      return projects.map((project) => <ProjectListItem key={project.id} project={project} />);
    }

    if (!isLoading && !projects[0]) {
      return <List.Item title="No projects found" icon={Icon.XmarkCircle} />;
    }
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter projects by name...">
      {renderProjects()}
    </List>
  );
}
