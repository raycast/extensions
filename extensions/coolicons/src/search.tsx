import React, { useMemo, useState } from "react";
import { getPreferenceValues, List, Grid } from "@raycast/api";
import IconsGrid from "./components/IconsGrid";
import IconsList from "./components/IconsList";
import { icons } from "./utils/icons";
import { iconCategoryMap } from "./utils/helpers";

const CATEGORIES = [
  "Interface",
  "Edit",
  "Arrow",
  "File",
  "System",
  "Communication",
  "Media",
  "Warning",
  "Navigation",
  "Menu",
  "Calendar",
  "User",
  "Environment",
  "Shape",
] as const;

const SearchIconsCommand = () => {
  const { view } = getPreferenceValues<{ view: "grid" | "list" }>();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");

  const filteredIcons = useMemo(() => {
    const queries = search
      .split(" ")
      .filter(Boolean)
      .map((q) => q.toLowerCase());

    let filtered = icons;
    if (category !== "all") {
      filtered = filtered.filter((icon) => iconCategoryMap[icon.name] === category);
    }
    if (queries.length === 0) return filtered;

    return filtered.filter((icon) => {
      const iconName = icon.name.toLowerCase();
      const iconNameWords = iconName.replace(/_/g, " ").split(" ");
      return queries.every((query) => iconNameWords.some((word) => word.startsWith(query)) || iconName.includes(query));
    });
  }, [search, category]);

  const gridDropdown = (
    <Grid.Dropdown tooltip="Filter by Category" storeValue={false} onChange={setCategory} defaultValue="all">
      <Grid.Dropdown.Item title="All Categories" value="all" />
      {CATEGORIES.map((cat) => (
        <Grid.Dropdown.Item key={cat} title={cat} value={cat} />
      ))}
    </Grid.Dropdown>
  ) as React.ReactElement;

  const listDropdown = (
    <List.Dropdown tooltip="Filter by Category" storeValue={false} onChange={setCategory} defaultValue="all">
      <List.Dropdown.Item title="All Categories" value="all" />
      {CATEGORIES.map((cat) => (
        <List.Dropdown.Item key={cat} title={cat} value={cat} />
      ))}
    </List.Dropdown>
  ) as React.ReactElement;

  return view === "grid" ? (
    <IconsGrid icons={filteredIcons} setSearch={setSearch} searchBarAccessory={gridDropdown} />
  ) : (
    <IconsList icons={filteredIcons} setSearch={setSearch} searchBarAccessory={listDropdown} />
  );
};

export default SearchIconsCommand;
