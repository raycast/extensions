import { List } from "@raycast/api";
import { useState } from "react";

import ProjectClosedDropdown from "./components/ProjectClosedDropdown";
import ProjectListEmptyView from "./components/ProjectListEmptyView";
import ProjectListItem from "./components/ProjectListItem";
import { withGitHubClient } from "./helpers/withGithubClient";
import { useMyProjects } from "./hooks/useMyProjects";

function MyProjects() {
  const [projectState, setProjectState] = useState<string>("open");
  const { data, isLoading, mutate } = useMyProjects(projectState === "all" ? null : projectState === "closed");

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter projects by name"
      searchBarAccessory={<ProjectClosedDropdown setClosed={setProjectState} />}
    >
      {(data || []).map((project) => {
        return (
          <ProjectListItem
            key={`project-${project.id}-${project.closed ? "closed" : "open"}`}
            project={project}
            mutateList={mutate}
          />
        );
      })}
      <ProjectListEmptyView />
    </List>
  );
}

export default withGitHubClient(MyProjects);
