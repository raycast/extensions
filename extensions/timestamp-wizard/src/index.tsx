import { List } from "@raycast/api";
import { useState } from "react";
import { TimeItem } from "./components/TimeItem";
import { useCurrentTime } from "./hooks/useCurrentTime";
import { useTimeConverter } from "./hooks/useTimeConverter";
import { ConversionResult } from "./types";

/**
 * Main Command Component
 */
export default function Command() {
  const [searchText, setSearchText] = useState<string>("");
  const { isShowingCurrentTime, setIsShowingCurrentTime, currentTimeItems } = useCurrentTime();
  const { conversionResult, convertTime } = useTimeConverter();

  // Handle search text changes
  const handleSearchTextChange = (text: string) => {
    setSearchText(text);

    // If input is empty, switch to current time display mode
    if (!text.trim()) {
      setIsShowingCurrentTime(true);
      return;
    }

    // If there's input, turn off current time mode and perform conversion
    setIsShowingCurrentTime(false);
    convertTime(text);
  };

  // Determine which items should be displayed
  const displayItems: ConversionResult = isShowingCurrentTime ? currentTimeItems : conversionResult;

  return (
    <List
      searchText={searchText}
      onSearchTextChange={handleSearchTextChange}
      searchBarPlaceholder="Enter timestamp or date (e.g.: 1715558400 or 2024-05-13 15:00)"
      throttle={false}
    >
      {displayItems.map((item) => (
        <TimeItem key={item.id} item={item} />
      ))}
    </List>
  );
}
