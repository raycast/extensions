import { Image, List } from "@raycast/api";

import ColorActions from "./ColorActions";

import { AvailableColor } from "../colors/Color";

export default function ColorListItem({
  color,
  accessories,
  storageMode = false,
}: {
  color: AvailableColor;
  accessories?: { text?: string; icon?: Image.ImageLike }[];
  storageMode?: boolean;
}) {
  return (
    <List.Item
      title={color.stringValue()}
      accessories={accessories || []}
      icon={{
        source: "solid-circle.png",
        mask: Image.Mask.Circle,
        tintColor: {
          light: color.stringValue(),
          dark: color.stringValue(),
          adjustContrast: false,
        },
      }}
      actions={<ColorActions color={color} storageMode={storageMode} />}
    />
  );
}
