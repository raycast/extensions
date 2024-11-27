import { useMemo, useState } from "react";
import { IconEntry, icons } from "@phosphor-icons/core";
import { getPreferenceValues } from "@raycast/api";
import IconsGrid from "./components/IconsGrid";
import IconsList from "./components/IconsList";

// @phosphor-icons has tricky typescript setup
// This is hacky way to create type that is easy to use in code
// Casting is safe, because all icons match IconEntry
// https://github.com/phosphor-icons/core?tab=readme-ov-file#catalog
const allIcons = icons as unknown as IconEntry[];

const SearchIconsCommand = () => {
  const { view } = getPreferenceValues<{ view: "grid" | "list" }>();
  const [weight, setWeight] = useState("regular");
  const [search, setSearch] = useState("");

  const filteredIcons = useMemo<IconEntry[]>(() => {
    const queries = search
      .split(" ")
      .filter(Boolean)
      .map((q) => q.toLowerCase());
    if (queries.length === 0) return allIcons;

    return allIcons.filter((i) => {
      const searchValues = [...i.tags, ...i.categories, i.name, i.pascal_name].map((s) => s.toLowerCase());
      return queries.find((q) => searchValues.find((v) => v.includes(q)));
    });
  }, [search]);

  return view === "list" ? (
    <IconsList weight={weight} icons={filteredIcons} setSearch={setSearch} setWeight={setWeight} />
  ) : (
    <IconsGrid weight={weight} icons={filteredIcons} setSearch={setSearch} setWeight={setWeight} />
  );
};

export default SearchIconsCommand;
