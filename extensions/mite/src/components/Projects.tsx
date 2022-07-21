import { Action, ActionPanel, List } from "@raycast/api";
import React, { useEffect, useState } from "react";
import { Project } from "../model/Project";
import { getProjects } from "../utils/api";
import Services from "./Services";

interface State {
  loading: boolean;
  projects: Project[];
}

export default function Projects() {
  const [state, setState] = useState<State>({ loading: true, projects: [] });

  useEffect(() => {
    (async () => {
      try {
        const { data: projects } = await getProjects();
        setState({ loading: false, projects });
      } catch (error) {
        setState((previous) => ({ ...previous, loading: false }));
      }
    })();
  }, []);

  function getListItem(project: Project) {
    return (
      <List.Item
        key={project.id}
        title={project.name ? project.customer_name + " | " + project.name : "Unknown"}
        actions={
          <ActionPanel>
            <Action.Push title="Next" target={<Services projectId={project.id} projectName={project.name} />} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List isLoading={state.loading} navigationTitle="Select Project" searchBarPlaceholder="Browse Projects">
      <List.Item
        key="0"
        title="-"
        actions={
          <ActionPanel>
            <Action.Push title="Next" target={<Services projectId={0} projectName={""} />} />
          </ActionPanel>
        }
      />
      {/*<List.Section title="Popular">*/}
      {/*  {state.projects*/}
      {/*    .filter((project) =>*/}
      {/*      ["X"] // TODO: get popular projects dynamically */}
      {/*        .some((str) => project.name.includes(str))*/}
      {/*    )*/}
      {/*    .map((project) => getListItem(project))}*/}
      {/*</List.Section>*/}
      {/*<List.Section title="All">*/}
      {state.projects.map((project) => getListItem(project))}
      {/*</List.Section>*/}
    </List>
  );
}
