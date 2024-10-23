import { useEffect, useState } from "react";
import { getSelectedText, List } from "@raycast/api";
import { useColorSections } from "./hooks";
import colors from "./colors";
import { LaunchProps, DropdownProps } from "./types";

const isValidHexColor = (color: string): boolean => {
  const hexPattern = /^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
  return hexPattern.test(color);
};

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
  const initialText = color || "";
  const [searchText, setSearchText] = useState(initialText);
  const [section, setSection] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const { filteredSections, categories } = useColorSections(colors, searchText, section);

  useEffect(() => {
    setIsLoading(true);

    async function fetchAndSetSearchText() {
      const selectedText = await getSelectedText().catch(() => "");

      const searchTextToUse = color || selectedText || "";

      if (isValidHexColor(selectedText)) {
        setSearchText(searchTextToUse);
      }

      setIsLoading(false);
    }

    if (!color) {
      fetchAndSetSearchText();
    } else {
      setIsLoading(false);
    }
  }, [color]);

  return (
    <List
      isLoading={isLoading}
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
