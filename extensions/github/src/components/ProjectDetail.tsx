import { Color, Detail, Icon } from "@raycast/api";
import { MutatePromise, useCachedPromise } from "@raycast/utils";
import { format } from "date-fns";

import { getGitHubClient } from "../api/githubClient";
import { ProjectFieldsFragment } from "../generated/graphql";
import { getProjectCreator } from "../helpers/project";
import { useMyProjects } from "../hooks/useMyProjects";

import ProjectActions from "./ProjectActions";

type ProjectDetailProps = {
  project: ProjectFieldsFragment;
  mutateList?: MutatePromise<ProjectFieldsFragment[] | undefined> | ReturnType<typeof useMyProjects>["mutate"];
};

export default function ProjectDetail({ project: initialProject, mutateList }: ProjectDetailProps) {
  const { github } = getGitHubClient();

  const {
    data: project,
    isLoading,
    mutate: mutateDetail,
  } = useCachedPromise(
    async (projectId) => {
      const issueDetails = await github.projectDetails({ nodeId: projectId });
      return issueDetails.node as ProjectFieldsFragment;
    },
    [initialProject.id],
    { initialData: initialProject },
  );

  const creator = getProjectCreator(project);
  const markdown = `# ${project.title}\n\n${project.readme ?? "> No README provided."}`;

  return (
    <Detail
      markdown={markdown}
      isLoading={isLoading}
      navigationTitle={project.title}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Project" text={project.title} />
          <Detail.Metadata.Label title="Description" text={project.shortDescription ?? "No description provided"} />
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item
              text={project.public ? "Public" : "Private"}
              color={project.public ? Color.Green : Color.Orange}
              icon={project.public ? Icon.Globe : Icon.Lock}
            />
            <Detail.Metadata.TagList.Item
              text={project.closed ? "Closed" : "Open"}
              color={project.closed ? Color.Red : Color.Green}
              icon={project.closed ? Icon.Xmark : Icon.Checkmark}
            />
          </Detail.Metadata.TagList>
          {project.updatedAt ? (
            <Detail.Metadata.Label title="Updated" text={format(new Date(project.updatedAt), "dd MMM yyyy, HH:mm")} />
          ) : null}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Creator" text={creator.text} icon={creator.icon} />
          {project.createdAt ? (
            <Detail.Metadata.Label title="Created" text={format(new Date(project.createdAt), "dd MMM yyyy, HH:mm")} />
          ) : null}
        </Detail.Metadata>
      }
      actions={<ProjectActions project={project} mutateList={mutateList} mutateDetail={mutateDetail} />}
    />
  );
}
