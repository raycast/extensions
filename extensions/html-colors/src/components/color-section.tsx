import { List } from "@raycast/api";
import { ColorResult } from "../utils/search-utils";
import { ColorListItem } from "./color-list-item";

/**
 * Section component that displays a group of colors with the same shade.
 * Each color in the section is rendered as a ColorListItem with consistent formatting options.
 */
export function ColorSection({
  shade,
  colors,
  showHex,
  isDetailVisible,
  onColorSelect,
  onToggleFormat,
  onToggleDetail,
}: {
  shade: string;
  colors: ColorResult[];
  showHex: boolean;
  isDetailVisible: boolean;
  onColorSelect: (color: ColorResult) => Promise<void>;
  onToggleFormat: () => void;
  onToggleDetail: () => void;
}) {
  return (
    <List.Section title={shade.charAt(0).toUpperCase() + shade.slice(1)}>
      {colors.map((color) => (
        <ColorListItem
          key={`${color.categories[0]}-${color.name}-${color.hex}-${color.rgb}-${color.format}`}
          color={color}
          onSelect={onColorSelect}
          showHex={showHex}
          onToggleFormat={onToggleFormat}
          isDetailVisible={isDetailVisible}
          onToggleDetail={onToggleDetail}
        />
      ))}
    </List.Section>
  );
}
