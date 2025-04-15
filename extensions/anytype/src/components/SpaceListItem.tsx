import { List, Image, Icon } from "@raycast/api";
import { MutatePromise } from "@raycast/utils";
import { Space } from "../helpers/schemas";
import SpaceActions from "./SpaceActions";

type SpaceListItemProps = {
  space: Space;
  icon: Image;
  memberCount: number;
  mutate: MutatePromise<Space[]>;
};

export default function SpaceListItem({ space, icon, memberCount, mutate }: SpaceListItemProps) {
  return (
    <List.Item
      key={space.id}
      title={space.name}
      accessories={[
        {
          icon: Icon.PersonCircle,
          text: memberCount.toString(),
          tooltip: `Members: ${memberCount}`,
        },
      ]}
      icon={icon}
      actions={<SpaceActions space={space} mutate={mutate} />}
    />
  );
}
