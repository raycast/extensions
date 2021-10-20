import { useState, useEffect } from "react";
import { List, Icon, showToast, ToastStyle } from "@raycast/api";
import { ProjectListItem } from "../components";
import { getCurrentUser, getProjects, getTimeRecords } from "../api";
import { Project } from "../types";
import { createResolvedToast } from "../utils";

export function ProjectList() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [timeRecords, setTimeRecords] = useState<Array<any>>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  const fetchTimeRecords = async (userId: string) => {
    return await getTimeRecords(userId);
  };

  useEffect(() => {
    async function fetch() {
      const toast = await showToast(ToastStyle.Animated, "Fetching Projects");
      try {
        const projectsResp = await getProjects();
        const currentUser = await getCurrentUser();
        const records = await fetchTimeRecords(currentUser.id);

        setTimeRecords(records);
        setCurrentUserId(currentUser.id);
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
        <ProjectListItem
          timeRecords={timeRecords}
          refreshRecords={() => fetchTimeRecords(currentUserId)}
          key={project.id}
          project={project}
        />
      ));
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
