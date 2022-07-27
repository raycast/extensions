import { Grid } from "@raycast/api";
import { IconActionPanel } from "./actions";
import { Icon8 } from "../types/types";
import { PinnedMovement } from "../utils/storage";
import { previewSize } from "../utils/grid";

export interface IconProps {
  icon: Icon8;
  refresh: () => void;
  platform?: string;
  pinned?: boolean;
  recent?: boolean;
  movement?: PinnedMovement;
  options: any;
  setOptions: (options: any) => void;
}

export const Icon8Item = (props: IconProps): JSX.Element => {
  const icon = props.icon;

  return (
    <Grid.Item
      key={icon.id}
      content={{
        value: {
          source: icon.url.replace("$preview-size", previewSize),
          tintColor: icon.isColor ? null : props.options.color,
        },
        tooltip: icon.name,
      }}
      subtitle={icon.name}
      actions={<IconActionPanel props={props} item={true} />}
    />
  );
};
