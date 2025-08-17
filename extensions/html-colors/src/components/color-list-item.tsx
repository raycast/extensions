import { List, Image } from "@raycast/api";
import { useMemo } from "react";
import { ColorWithCategories } from "../types";
import { getCategoryIcons } from "../utils/color-utils";
import { ColorListItemActions } from "./color-list-item-actions";
import { ColorListItemDetail } from "./color-list-item-detail";

/**
 * List item component for displaying a color with its details and actions.
 * Shows color name, format (HEX/RGB), preview, and category indicators.
 */
export function ColorListItem({
  color,
  onSelect,
  showHex,
  onToggleFormat,
  isDetailVisible,
  onToggleDetail,
}: {
  color: ColorWithCategories;
  onSelect: (color: ColorWithCategories) => void;
  showHex: boolean;
  onToggleFormat: () => void;
  isDetailVisible: boolean;
  onToggleDetail: () => void;
}) {
  const accessories = useMemo(() => getCategoryIcons(color.categories), [color.categories]);

  const icon = useMemo(() => {
    const svg = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="8" cy="8" r="8" fill="${color.rgb}"/></svg>`;
    const base64 = Buffer.from(svg).toString("base64");
    const dataURI = `data:image/svg+xml;base64,${base64}`;

    return { source: dataURI, mask: Image.Mask.Circle };
  }, [color.rgb]);

  return (
    <List.Item
      title={color.name}
      subtitle={showHex ? color.hex : color.rgb}
      icon={icon}
      accessories={accessories}
      detail={isDetailVisible ? <ColorListItemDetail color={color} /> : undefined}
      actions={
        <ColorListItemActions
          color={color}
          onSelect={onSelect}
          showHex={showHex}
          onToggleFormat={onToggleFormat}
          isDetailVisible={isDetailVisible}
          onToggleDetail={onToggleDetail}
        />
      }
    />
  );
}
