import { List, showToast, Toast, Icon, Clipboard } from "@raycast/api";
import { useState, useMemo } from "react";
import { basicColors, extendedColors } from "./constants";
import { ColorListItem } from "./components/color-list-item";
import { searchColors, ColorResult } from "./utils/search-utils";

type ColorFilter = "all" | "basic" | "extended";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [colorFilter, setColorFilter] = useState<ColorFilter>("all");
  const [showHex, setShowHex] = useState(true);
  const [isDetailVisible, setIsDetailVisible] = useState(false);

  const colors = useMemo(() => {
    switch (colorFilter) {
      case "basic":
        return basicColors;
      case "extended":
        return extendedColors;
      default:
        return [...basicColors, ...extendedColors];
    }
  }, [colorFilter]);

  const filteredColors = useMemo(() => {
    return searchColors(colors, searchText);
  }, [colors, searchText]);

  const handleColorSelect = async (color: ColorResult) => {
    let textToCopy = "";
    switch (color.format) {
      case "rgb":
        textToCopy = color.rgb;
        break;
      case "name":
        textToCopy = color.id;
        break;
      default:
        textToCopy = color.hex;
    }

    await Clipboard.copy(textToCopy);
    await showToast({
      style: Toast.Style.Success,
      title: "Color copied to clipboard",
      message: textToCopy,
    });
  };

  return (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Name, hex, or RGB..."
      isShowingDetail={isDetailVisible}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Color Set"
          value={colorFilter}
          onChange={(value) => setColorFilter(value as ColorFilter)}
        >
          <List.Dropdown.Item title="All Colors" value="all" icon={Icon.StackedBars3} />
          <List.Dropdown.Item title="Basic Colors" value="basic" icon={Icon.Circle} />
          <List.Dropdown.Item title="Extended Colors" value="extended" icon={Icon.CircleEllipsis} />
        </List.Dropdown>
      }
    >
      {filteredColors.map((color) => (
        <ColorListItem
          key={`${color.categories[0]}-${color.name}-${color.hex}`}
          color={color}
          onSelect={handleColorSelect}
          showHex={showHex}
          onToggleFormat={() => setShowHex(!showHex)}
          isDetailVisible={isDetailVisible}
          onToggleDetail={() => setIsDetailVisible(!isDetailVisible)}
        />
      ))}
    </List>
  );
}
