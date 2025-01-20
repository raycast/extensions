import { List, Icon, Image } from "@raycast/api";
import { MutatePromise } from "@raycast/utils";
import { Detail, Type, SpaceObject, Member } from "../helpers/schemas";
import ObjectActions from "./ObjectActions";

type ObjectListItemProps = {
  spaceId: string;
  objectId: string;
  icon: string | { source: string; mask: Image.Mask };
  title: string;
  subtitle?: { value: string; tooltip: string };
  accessories?: {
    icon?: Icon | { source: string; mask: Image.Mask };
    date?: Date;
    text?: string;
    tooltip?: string;
  }[];
  details?: Detail[];
  mutate: MutatePromise<SpaceObject[] | Type[] | Member[]>;
  viewType: string;
};

export default function ObjectListItem({
  spaceId,
  objectId,
  icon,
  title,
  subtitle,
  accessories,
  details,
  mutate,
  viewType,
}: ObjectListItemProps) {
  return (
    <List.Item
      title={title}
      subtitle={subtitle ? { value: subtitle.value, tooltip: subtitle.tooltip } : undefined}
      icon={typeof icon === "string" ? { source: icon } : icon}
      accessories={accessories?.map((accessory) => {
        const { icon, date, text, tooltip } = accessory;
        const accessoryProps: {
          icon?: Icon | { source: string; mask: Image.Mask };
          date?: Date;
          text?: string;
          tooltip?: string;
        } = {};

        if (icon) accessoryProps.icon = icon;
        if (date) accessoryProps.date = date;
        if (text) accessoryProps.text = text;
        if (tooltip) accessoryProps.tooltip = tooltip;

        return accessoryProps;
      })}
      actions={
        <ObjectActions
          spaceId={spaceId}
          objectId={objectId}
          title={title}
          details={details}
          mutate={mutate}
          viewType={viewType}
        />
      }
    />
  );
}
