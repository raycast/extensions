import React, { useState, useMemo, useEffect } from "react";
import { List, Icon } from "@raycast/api";
import { CategoryType } from "../types";
import { cheatsheetData } from "../data";
import { CATEGORIES, SECTION_ORDER } from "../utils/constants";
import { useCopyToClipboard } from "../hooks/useCopyToClipboard";
import { CommandItem, ThinkingKeywordItem } from "./ListItem";
import { applyFilters } from "../utils/filterUtils";
import { UI_STRINGS } from "../constants/strings";

const categoryList = SECTION_ORDER.map(id => ({
  id,
  title: CATEGORIES[id],
  // Placeholder for adding icons in the future
  // icon: getIconForCategory(id)
}));

export function CommandList() {
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>("all");
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { copyToClipboard } = useCopyToClipboard();

  // Handle loading state for search/filter operations
  useEffect(() => {
    if (searchText || selectedCategory !== "all") {
      setIsLoading(true);
      const timer = setTimeout(() => setIsLoading(false), 100);
      return () => clearTimeout(timer);
    }
  }, [searchText, selectedCategory]);

  const filteredSections = useMemo(() => {
    return applyFilters(cheatsheetData.sections, selectedCategory, searchText);
  }, [selectedCategory, searchText]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={UI_STRINGS.searchPlaceholder}
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown
          tooltip={UI_STRINGS.selectCategory}
          value={selectedCategory}
          onChange={v => setSelectedCategory(v as CategoryType)}
        >
          <List.Dropdown.Item title={UI_STRINGS.allCategories} value="all" />
          {categoryList.map(category => (
            <List.Dropdown.Item key={category.id} title={category.title} value={category.id} />
          ))}
        </List.Dropdown>
      }
    >
      {filteredSections.length > 0 ? (
        filteredSections.map(section => (
          <List.Section key={section.id} title={section.title}>
            {(section.commands || []).map(command => (
              <CommandItem key={command.id} command={command} onCopy={copyToClipboard} />
            ))}
            {(section.thinkingKeywords || []).map(keyword => (
              <ThinkingKeywordItem key={keyword.keyword} keyword={keyword} onCopy={copyToClipboard} />
            ))}
          </List.Section>
        ))
      ) : (
        <List.EmptyView
          title={UI_STRINGS.noCommandsFound}
          description={UI_STRINGS.noCommandsDescription}
          icon={Icon.MagnifyingGlass}
        />
      )}
    </List>
  );
}
