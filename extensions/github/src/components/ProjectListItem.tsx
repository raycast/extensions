import { Action, Color, Icon, List } from "@raycast/api";
import { MutatePromise } from "@raycast/utils";
import { format } from "date-fns";

import { ProjectFieldsFragment } from "../generated/graphql";
import { getProjectCreator } from "../helpers/project";
import { useMyProjects } from "../hooks/useMyProjects";

import ProjectActions from "./ProjectActions";
import ProjectDetail from "./ProjectDetail";

type ProjectListItemProps = {
  project: ProjectFieldsFragment;
  mutateList: MutatePromise<ProjectFieldsFragment[] | undefined> | ReturnType<typeof useMyProjects>["mutate"];
};

export default function ProjectListItem({ project, mutateList }: ProjectListItemProps) {
  const updatedAt = new Date(project.updatedAt);

  const creator = getProjectCreator(project);

  const accessories: List.Item.Accessory[] = [
    {
      date: updatedAt,
      tooltip: `Updated: ${format(updatedAt, "EEEE d MMMM yyyy 'at' HH:mm")}`,
    },
    {
      icon: creator.icon,
      tooltip: `Creator: ${creator.text}`,
    },
  ];

  return (
    <List.Item
      title={project.title}
      subtitle={project.shortDescription ?? ""}
      icon={{
        value: {
          source: "project.svg",
          tintColor: project.closed ? Color.Orange : Color.Green,
        },
        tooltip: `Closed: ${project.closed ? "Yes" : "No"}`,
      }}
      accessories={accessories}
      actions={
        <ProjectActions project={project} mutateList={mutateList}>
          <Action.Push title="Show Details" icon={Icon.Sidebar} target={<ProjectDetail project={project} />} />
        </ProjectActions>
      }
    />
  );
}
