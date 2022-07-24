import { Grid, Color } from "@raycast/api";
import { IconActionPanel } from "./actions";
import { Icon8 } from "../types/types";
import { PinnedMovement } from "../utils/storage";

export interface IconProps {
  icon: Icon8;
  refresh: () => void;
  platform?: string; 
  pinned?: boolean;
  recent?: boolean;
  movement?: PinnedMovement; 
};

export const Icon8Item = (props: IconProps): JSX.Element => {
  const icon = props.icon;

  return (
    <Grid.Item
      key={icon.id}
      content={{
        value: { source: icon.url, tintColor: icon.color ? null : Color.PrimaryText },
        tooltip: icon.name,
      }}
      subtitle={icon.name}
      actions={<IconActionPanel {...props}/>}
    />
  );
};
