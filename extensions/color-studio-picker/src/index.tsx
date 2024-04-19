import { useEffect, useState } from "react";
import { getSelectedText, List } from "@raycast/api";
import { useColorSections } from "./hooks";
import colors from "./colors";
import { LaunchProps, DropdownProps } from "./types";

const DropdownCategories = ({ categories, setSection }: DropdownProps) => (
  <List.Dropdown tooltip="Select Category" onChange={setSection}>
    <List.Dropdown.Item key="all_categories" title="All palettes" value="" />
    {categories.map((category: string) => (
      <List.Dropdown.Item key={category} title={category} value={category} />
    ))}
  </List.Dropdown>
);

export default function Command(props: LaunchProps) {
  const { color } = props.arguments;
  const [searchText, setSearchText] = useState("");
  const [section, setSection] = useState("");
  const { filteredSections, categories } = useColorSections(colors, searchText, section);

  useEffect(() => {
    async function fetchAndSetSearchText() {
      let selectedText = "";
      try {
        selectedText = await getSelectedText();
      } catch (error) {
        /* no-op */
      }

      const searchTextToUse = color || selectedText || "";
      setSearchText(searchTextToUse);
    }

    fetchAndSetSearchText();
  }, [color]);

  return (
    <List
      searchText={searchText}
      searchBarPlaceholder="Filter colors by name or HEX code"
      onSearchTextChange={setSearchText}
      searchBarAccessory={<DropdownCategories categories={categories} setSection={setSection} />}
    >
      {filteredSections.map((section, index) => (
        <List.Section key={index} title={section.title}>
          {section.items}
        </List.Section>
      ))}
    </List>
  );
}
