import { Project } from "@makeplane/plane-node-sdk";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { getProjectIcon } from "../helpers/icons";
import ProjectWorkItemsList from "./ProjectWorkItemsList";

type ProjectItemListItemProps = {
  projectItem: Project;
};

export default function ProjectItemListItem({ projectItem }: ProjectItemListItemProps) {
  return (
    <List.Item
      icon={getProjectIcon(projectItem.logoProps)}
      title={projectItem.name}
      keywords={[projectItem.identifier]}
      detail={
        <List.Item.Detail
          markdown={`![Cover](${projectItem.coverImage}) \n\n ${projectItem.description}`}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Identifier" text={projectItem.identifier} />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel title={projectItem.identifier}>
          <Action.Push
            icon={Icon.BullsEye}
            title="Open Work Items"
            target={<ProjectWorkItemsList projectItem={projectItem} />}
          />
        </ActionPanel>
      }
    />
  );
}
