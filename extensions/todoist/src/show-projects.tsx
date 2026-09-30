import { ActionPanel, Icon, List, Action } from "@raycast/api";
import { useMemo } from "react";

import ProjectForm from "./components/ProjectForm";
import ProjectListItem from "./components/ProjectListItem";
import { withTodoistApi } from "./helpers/withTodoistApi";
import useSyncData from "./hooks/useSyncData";

function Projects() {
  const { data, setData, isLoading } = useSyncData();

  const projects = useMemo(() => {
    return data?.projects.filter((p) => !p.inbox_project) ?? [];
  }, [data]);

  return (
    <List searchBarPlaceholder="Filter projects by name" isLoading={isLoading}>
      {projects.map((project) => {
        return <ProjectListItem key={project.id} project={project} data={data} setData={setData} />;
      })}

      <List.EmptyView
        title="You don't have any projects."
        actions={
          <ActionPanel>
            <Action.Push title="Create Project" icon={Icon.Plus} target={<ProjectForm fromProjectList={true} />} />
          </ActionPanel>
        }
      />
    </List>
  );
}

export default withTodoistApi(Projects);
