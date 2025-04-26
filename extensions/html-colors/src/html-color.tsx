import { List, showToast, Toast, Icon, Clipboard } from "@raycast/api";
import { useState, useMemo } from "react";
import { basicColors, extendedColors } from "./constants";
import { ColorListItem } from "./components/color-list-item";
import { ColorSection } from "./components/color-section";
import { searchColors, ColorResult } from "./utils/search-utils";
import { showFailureToast } from "@raycast/utils";
import { groupColorsByShade } from "./utils/color-utils";
import { sortSectionsByRelevance } from "./utils/section-utils";

type ViewOption = "all" | "basic" | "extended" | "grouped";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [viewOption, setViewOption] = useState<ViewOption>("all");
  const [showHex, setShowHex] = useState(true);
  const [isDetailVisible, setIsDetailVisible] = useState(false);

  const colors = useMemo(() => {
    switch (viewOption) {
      case "basic":
        return basicColors;
      case "extended":
        return extendedColors;
      case "all":
      case "grouped":
        return [...basicColors, ...extendedColors];
    }
  }, [viewOption]);

  const filteredColors = useMemo(() => {
    return searchColors(colors, searchText);
  }, [colors, searchText]);

  const groupedColors = useMemo(() => {
    if (viewOption !== "grouped") return null;
    return groupColorsByShade(filteredColors);
  }, [filteredColors, viewOption]);

  const sortedSections = useMemo(() => {
    if (!groupedColors) return [];
    return sortSectionsByRelevance(Object.entries(groupedColors), searchText);
  }, [groupedColors, searchText]);

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

    try {
      await Clipboard.copy(textToCopy);
      await showToast({
        style: Toast.Style.Success,
        title: "Color copied to clipboard",
        message: textToCopy,
      });
    } catch (err) {
      await showFailureToast({
        title: "Failed to copy color",
        error: err,
      });
    }
  };

  const handleToggleFormat = () => setShowHex(!showHex);
  const handleToggleDetail = () => setIsDetailVisible(!isDetailVisible);

  return (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Name, hex, or RGB..."
      isShowingDetail={isDetailVisible}
      isLoading={false}
      searchBarAccessory={
        <List.Dropdown
          tooltip="View Options"
          value={viewOption}
          onChange={(value) => setViewOption(value as ViewOption)}
        >
          <List.Dropdown.Item title="All Colors" value="all" icon={Icon.StackedBars3} />
          <List.Dropdown.Item title="Basic Colors" value="basic" icon={Icon.Circle} />
          <List.Dropdown.Item title="Extended Colors" value="extended" icon={Icon.CircleEllipsis} />
          <List.Dropdown.Section title="Grouping">
            <List.Dropdown.Item title="Group by Shade" value="grouped" icon={Icon.Layers} />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {viewOption === "grouped" && groupedColors
        ? sortedSections.map(([shade, colors]) => (
            <ColorSection
              key={shade}
              shade={shade}
              colors={colors}
              showHex={showHex}
              isDetailVisible={isDetailVisible}
              onColorSelect={handleColorSelect}
              onToggleFormat={handleToggleFormat}
              onToggleDetail={handleToggleDetail}
            />
          ))
        : filteredColors.map((color) => (
            <ColorListItem
              key={`${color.categories[0]}-${color.name}-${color.hex}-${color.rgb}-${color.format}`}
              color={color}
              onSelect={handleColorSelect}
              showHex={showHex}
              onToggleFormat={handleToggleFormat}
              isDetailVisible={isDetailVisible}
              onToggleDetail={handleToggleDetail}
            />
          ))}
    </List>
  );
}
