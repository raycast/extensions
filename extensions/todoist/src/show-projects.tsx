import { ActionPanel, Icon, List, Action } from "@raycast/api";
import { useMemo } from "react";

import ProjectForm from "./components/ProjectForm";
import ProjectListItem from "./components/ProjectListItem";
import View from "./components/View";
import useCachedData from "./hooks/useCachedData";

function Projects() {
  const [data, setData] = useCachedData();

  const projects = useMemo(() => {
    return data?.projects.filter((p) => !p.inbox_project) ?? [];
  }, [data]);

  return (
    <List searchBarPlaceholder="Filter projects by name">
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

export default function Command() {
  return (
    <View>
      <Projects />
    </View>
  );
}
