import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { type ModrinthProject, useModrinthProject } from "./hooks/use-modrinth-project";
import type { ListModrinthProject } from "./hooks/use-modrinth-search";

type Props = {
  listProject: ListModrinthProject;
  isSelected: boolean;
};

export const ProjectListEntry = ({ listProject, isSelected }: Props) => {
  const { isLoading, project } = useModrinthProject({ projectId: listProject.slug, isSelected });

  return (
    <List.Item
      icon={listProject.icon_url}
      title={listProject.title}
      accessories={[{ text: listProject.author }]}
      id={listProject.slug}
      detail={project && <ProjectDetail project={project} isLoading={isLoading} />}
      actions={project && <ProjectActions project={project} />}
    />
  );
};

const ProjectActions = ({ project }: { project: ModrinthProject }) => {
  return (
    <ActionPanel>
      <Action.OpenInBrowser
        url={`https://modrinth.com/${project.project_type}/${project.slug}`}
        title="Open in Modrinth"
        shortcut={{ modifiers: ["cmd"], key: "m" }}
      />
      <ActionPanel.Section title="Links">
        {project.source_url && (
          <Action.OpenInBrowser
            title="Source Code"
            url={project.source_url}
            icon={Icon.Code}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
          />
        )}
        {project.issues_url && (
          <Action.OpenInBrowser
            title="Issues"
            url={project.issues_url}
            icon={Icon.Warning}
            shortcut={{ modifiers: ["cmd"], key: "i" }}
          />
        )}
        {project.wiki_url && (
          <Action.OpenInBrowser
            title="See Wiki"
            url={project.wiki_url}
            icon={Icon.Book}
            shortcut={{ modifiers: ["cmd"], key: "l" }}
          />
        )}
        {project.discord_url && (
          <Action.OpenInBrowser
            title="Join Discord"
            url={project.discord_url}
            icon={Icon.TwoPeople}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
          />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section title="Donate">
        {project.donation_urls?.map((donation) => {
          return <Action.OpenInBrowser key={donation.id} title={donation.platform} url={donation.url} />;
        })}
      </ActionPanel.Section>
    </ActionPanel>
  );
};

const ProjectDetail = ({ project, isLoading }: { project: ModrinthProject; isLoading: boolean }) => {
  return (
    <List.Item.Detail markdown={project.body} metadata={<ProjectMetadata project={project} />} isLoading={isLoading} />
  );
};

const ProjectMetadata = ({ project }: { project: ModrinthProject }) => {
  const projectTypeString = project.project_type.charAt(0).toUpperCase() + project.project_type.slice(1);
  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Information" />
      <List.Item.Detail.Metadata.Label title="Type" text={projectTypeString} />
      <List.Item.Detail.Metadata.Label title="Followers" text={project.followers.toString()} icon={Icon.Person} />
      <List.Item.Detail.Metadata.Label title="Downloads" text={project.downloads.toString()} icon={Icon.Download} />
      {project.license && <List.Item.Detail.Metadata.Label title="License" text={project.license.id} />}

      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label title="Dates" />
      <List.Item.Detail.Metadata.Label title="Updated" text={new Date(project.updated).toDateString()} />
      <List.Item.Detail.Metadata.Label title="Approved" text={new Date(project.approved).toDateString()} />
      <List.Item.Detail.Metadata.Label title="Published" text={new Date(project.published).toDateString()} />
    </List.Item.Detail.Metadata>
  );
};
