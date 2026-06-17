import { useState, useEffect } from "react";
import { List, Icon, showToast, Toast } from "@raycast/api";
import { ProjectListItem } from "../components";
import { getProjects, getRecentTasks } from "../api";
import { Project, Task } from "../types";
import { createResolvedToast } from "../utils";

export function ProjectList() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [timeRecords, setTimeRecords] = useState<Array<Task>>([]);

  useEffect(() => {
    async function fetch() {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Fetching Projects",
      });
      try {
        const projectsResp = await getProjects();
        const records = await getRecentTasks();

        setTimeRecords(records);
        setProjects(projectsResp);
        setIsLoading(false);

        createResolvedToast(toast, "Projects Fetched").success();
      } catch (error) {
        const message = (error as { message: string }).message || "";
        createResolvedToast(toast, "Failed to fetch projects", message).error();
        setIsLoading(false);
      }
    }
    fetch();
  }, []);

  const renderProjects = () => {
    if (!isLoading && projects[0]) {
      return projects.map((project) => (
        <ProjectListItem timeRecords={timeRecords} refreshRecords={getRecentTasks} key={project.id} project={project} />
      ));
    }

    if (!isLoading && !projects[0]) {
      return <List.Item title="No projects found" icon={Icon.XMarkCircle} />;
    }
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter projects by name...">
      {renderProjects()}
    </List>
  );
}
