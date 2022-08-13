import { Image, List } from "@raycast/api";
import { getAvatarIcon } from "@raycast/utils";
import { Group } from "splitwise";

type GroupListProps = {
  groups?: Group[];
  isLoading?: boolean;
};

export default function GroupList({ groups = [], isLoading = false }: GroupListProps) {
  const groupsList = groups.sort((a, b) => new Date(a.updated_at).valueOf() - new Date(b.updated_at).valueOf());

  return (
    <List isLoading={isLoading}>
      {groupsList.map((group) => {
        return (
          <List.Item
            key={group.id}
            title={group.name}
            icon={
              group.avatar.original
                ? {
                    source: group.avatar.original,
                    mask: Image.Mask.Circle,
                  }
                : getAvatarIcon(group.name)
            }
            accessories={[
              {
                text: group.group_type,
              },
            ]}
          />
        );
      })}
    </List>
  );
}
