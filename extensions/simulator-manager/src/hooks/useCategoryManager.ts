import { useState, useEffect } from "react";
import { DeviceDisplayCategory } from "../types";

export function useCategoryManager(deviceTypesToDisplayPref?: DeviceDisplayCategory) {
  const deviceTypesToDisplay = deviceTypesToDisplayPref || "all";

  const [selectedCategory, setSelectedCategory] = useState<DeviceDisplayCategory>(
    deviceTypesToDisplay !== "all" ? deviceTypesToDisplay : "all",
  );

  const handleCategoryChange = (newCategory: DeviceDisplayCategory) => {
    if (deviceTypesToDisplay === "all") {
      setSelectedCategory(newCategory);
    }
  };

  useEffect(() => {
    if (deviceTypesToDisplay !== "all") {
      setSelectedCategory(deviceTypesToDisplay);
    }
  }, [deviceTypesToDisplay]);

  const showDropdown = deviceTypesToDisplay === "all";

  return {
    selectedCategory,
    deviceTypesToDisplay,
    handleCategoryChange,
    showDropdown,
  };
}
