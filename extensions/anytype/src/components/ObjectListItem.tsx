import { Image, List } from "@raycast/api";
import { MutatePromise } from "@raycast/utils";
import { ObjectActions, ViewType } from ".";
import { Member, Space, SpaceObject, Type, View } from "../models";

type ObjectListItemProps = {
  space: Space;
  objectId: string;
  icon: Image.ImageLike;
  title: string;
  subtitle?: { value: string; tooltip: string };
  accessories?: {
    icon?: Image.ImageLike;
    date?: Date;
    text?: string;
    tooltip?: string;
    tag?: { value: string; color: string; tooltip: string };
  }[];
  mutate: MutatePromise<SpaceObject[] | Type[] | Member[]>[];
  mutateViews?: MutatePromise<View[]>;
  member?: Member | undefined;
  layout: string;
  viewType: ViewType;
  isGlobalSearch: boolean;
  isNoPinView: boolean;
  isPinned: boolean;
};

export function ObjectListItem({
  space,
  objectId,
  icon,
  title,
  subtitle,
  accessories,
  mutate,
  mutateViews,
  member,
  layout,
  viewType,
  isGlobalSearch,
  isNoPinView,
  isPinned,
}: ObjectListItemProps) {
  return (
    <List.Item
      title={title}
      subtitle={subtitle ? { value: subtitle.value, tooltip: subtitle.tooltip } : undefined}
      icon={icon}
      accessories={[
        ...(accessories?.map((accessory) => {
          const { icon, date, text, tooltip, tag } = accessory;
          const accessoryProps: {
            icon?: Image.ImageLike;
            date?: Date;
            text?: string;
            tooltip?: string;
            tag?: { value: string; color: string; tooltip: string };
          } = {};

          if (icon) accessoryProps.icon = icon;
          if (date) accessoryProps.date = date;
          if (text) accessoryProps.text = text;
          if (tooltip) accessoryProps.tooltip = tooltip;
          if (tag) accessoryProps.tag = accessory.tag;

          return accessoryProps;
        }) || []),
      ]}
      actions={
        <ObjectActions
          space={space}
          objectId={objectId}
          title={title}
          mutate={mutate}
          mutateViews={mutateViews}
          member={member}
          layout={layout}
          viewType={viewType}
          isGlobalSearch={isGlobalSearch}
          isNoPinView={isNoPinView}
          isPinned={isPinned}
        />
      }
    />
  );
}
