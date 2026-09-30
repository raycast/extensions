import { Image, List } from "@raycast/api";
import { MutatePromise } from "@raycast/utils";
import { ObjectActions, ViewType } from ".";
import { Member, ObjectLayout, Property, Space, SpaceObject, Type, View } from "../models";

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
  mutate: MutatePromise<SpaceObject[] | Type[] | Property[] | Member[]>[];
  mutateViews?: MutatePromise<View[]>;
  object: SpaceObject | Type | Property | Member;
  layout: ObjectLayout | undefined;
  viewType: ViewType;
  isGlobalSearch: boolean;
  isNoPinView: boolean;
  isPinned: boolean;
  searchText: string;
  listId?: string;
  listName?: string;
  listLayout?: ObjectLayout;
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
  object,
  layout,
  viewType,
  isGlobalSearch,
  isNoPinView,
  isPinned,
  searchText,
  listId,
  listName,
  listLayout,
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
          object={object}
          layout={layout}
          viewType={viewType}
          isGlobalSearch={isGlobalSearch}
          isNoPinView={isNoPinView}
          isPinned={isPinned}
          searchText={searchText}
          listId={listId}
          listName={listName}
          listLayout={listLayout}
        />
      }
    />
  );
}
