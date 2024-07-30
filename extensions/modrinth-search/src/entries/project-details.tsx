import { Icon, List } from "@raycast/api";
import type { ListModrinthProject } from "../search-mods";

type Props = {
  project: ListModrinthProject;
};

export const ProjectMetadata = ({ project }: Props): React.ReactElement => {
  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Author" text={project?.author} />
      <List.Item.Detail.Metadata.Label title="Type" text={project?.project_type} />
      <List.Item.Detail.Metadata.Label title="Followers" text={project?.follows.toString()} icon={Icon.Person} />
      <List.Item.Detail.Metadata.Label title="Downloads" text={project?.downloads.toString()} icon={Icon.Download} />
      {/* <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label title="Dates" />
      <List.Item.Detail.Metadata.Label title="Updated" text={project?.updated} />
      <List.Item.Detail.Metadata.Label title="Approved" text={project?.approved} />
      <List.Item.Detail.Metadata.Label title="Published" text={project?.published} /> */}
    </List.Item.Detail.Metadata>
  );
};
