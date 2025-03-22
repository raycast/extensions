import { Grid } from "@raycast/api";
import { IconActionPanel } from "./actions";
import { IconProps } from "../types/types";
import { previewSize } from "../utils/utils";

export const Icon8Item = (props: IconProps): JSX.Element => {
  const icon = props.icon;
  const id = `${props.pinned ? "pinned" : props.recent ? "recent" : ""}-${icon.id}`;

  return (
    <Grid.Item
      id={id}
      key={icon.id}
      content={{
        value: {
          source: icon.url.replace("$preview-size", previewSize),
          tintColor: icon.isColor ? null : props.options.color,
        },
        tooltip: icon.name,
      }}
      subtitle={icon.name}
      actions={<IconActionPanel props={props} />}
    />
  );
};
