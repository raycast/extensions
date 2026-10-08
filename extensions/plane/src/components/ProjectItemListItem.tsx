import { NetworkEnum, Project } from "@makeplane/plane-node-sdk";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { getProjectIcon } from "../helpers/icons";
import ProjectWorkItemsList from "./ProjectWorkItemsList";

type ProjectItemListItemProps = {
  projectItem: Project;
};

export default function ProjectItemListItem({ projectItem }: ProjectItemListItemProps) {
  const projectTotalMembers = `${projectItem.totalMembers || 0}`;
  const accessories: List.Item.Accessory[] = [
    {
      tag: projectItem.identifier,
    },
    { icon: Icon.TwoPeople, text: projectTotalMembers, tooltip: `${projectTotalMembers} members` },
  ];
  if (projectItem.network !== undefined) {
    switch (projectItem.network) {
      case NetworkEnum.NUMBER_0:
        accessories.push({ icon: Icon.EyeDisabled, tooltip: "Private" });
        break;
      case NetworkEnum.NUMBER_2:
        accessories.push({ icon: Icon.Eye, tooltip: "Public" });
        break;
    }
  }
  return (
    <List.Item
      icon={getProjectIcon(projectItem.logoProps)}
      title={projectItem.name}
      subtitle={projectItem.description}
      keywords={[projectItem.identifier]}
      accessories={accessories}
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
