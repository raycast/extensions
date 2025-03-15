import { useState, useEffect } from "react";

export function useCategoryManager(deviceTypesToDisplay: string) {
  const [selectedCategory, setSelectedCategory] = useState<string>(
    deviceTypesToDisplay !== "all" ? deviceTypesToDisplay : "all",
  );

  const handleCategoryChange = (newCategory: string) => {
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
    handleCategoryChange,
    showDropdown,
  };
}
