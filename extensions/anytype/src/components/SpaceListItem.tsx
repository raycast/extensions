import { Image, List } from "@raycast/api";
import { MutatePromise } from "@raycast/utils";
import { SpaceActions } from ".";
import { Space } from "../models";

type SpaceListItemProps = {
  space: Space;
  icon: Image.ImageLike;
  accessories?: {
    icon?: Image.ImageLike;
    date?: Date;
    text?: string;
    tooltip?: string;
  }[];
  mutate: MutatePromise<Space[]>[];
  isPinned: boolean;
  searchText: string;
};

export function SpaceListItem({ space, icon, accessories, mutate, isPinned, searchText }: SpaceListItemProps) {
  return (
    <List.Item
      key={space.id}
      title={space.name}
      subtitle={{ value: space.description, tooltip: `Description: ${space.description}` }}
      accessories={[
        ...(accessories?.map((accessory) => {
          const { icon, date, text, tooltip } = accessory;
          const accessoryProps: {
            icon?: Image.ImageLike;
            date?: Date;
            text?: string;
            tooltip?: string;
          } = {};

          if (icon) accessoryProps.icon = icon;
          if (date) accessoryProps.date = date;
          if (text) accessoryProps.text = text;
          if (tooltip) accessoryProps.tooltip = tooltip;

          return accessoryProps;
        }) || []),
      ]}
      icon={icon}
      actions={<SpaceActions space={space} mutate={mutate} isPinned={isPinned} searchText={searchText} />}
    />
  );
}
