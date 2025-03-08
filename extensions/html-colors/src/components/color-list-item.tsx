import { List, Icon } from "@raycast/api";
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

  return (
    <List.Item
      title={color.name}
      subtitle={showHex ? color.hex : color.rgb}
      icon={{ source: Icon.CircleFilled, tintColor: color.hex }}
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
