import { Icon, List } from "@raycast/api";
import { useState } from "react";
import { CodeSmells } from "./data/code-smells";
import { Smells } from "./components/smells";
import { ListSectionCategory } from "./components/ListSectionCategory";
import { obstructions } from "./data/obstructions";
import { ocurrences } from "./data/ocurrences";
import { smellHierarchies } from "./data/smellHierarchies";

function textIsIncludeIn(text: string, searchText: string) {
  return text.toLowerCase().includes(searchText.toLowerCase());
}

export default function Command() {
  const [searchText, setSearchText] = useState<string>("");

  const filterCodeSmells = CodeSmells.filter((smell) => textIsIncludeIn(smell.name, searchText));
  const filterObstructions = obstructions.filter((obstruction) => textIsIncludeIn(obstruction, searchText));
  const filterOcurrences = ocurrences.filter((ocurrence) => textIsIncludeIn(ocurrence, searchText));
  const filterHierarchies = smellHierarchies.filter((hierarchy) => textIsIncludeIn(hierarchy, searchText));

  return (
    <List
      filtering={false}
      onSearchTextChange={setSearchText}
      navigationTitle="Search smells"
      searchBarPlaceholder="Search..."
    >
      <ListSectionCategory
        sectionTitle={"Obstructions"}
        items={filterObstructions}
        icon={Icon.Folder}
        categoryFilterName="Obstruction"
      />

      <ListSectionCategory
        sectionTitle={"Ocurrences"}
        items={filterOcurrences}
        icon={Icon.Folder}
        categoryFilterName="Ocurrence"
      />

      <ListSectionCategory
        sectionTitle="Smell Hierarchies"
        items={filterHierarchies}
        icon={Icon.Folder}
        categoryFilterName="SmellHierarchies"
      />

      <List.Section title="Smells">
        <Smells smells={filterCodeSmells} />
      </List.Section>
    </List>
  );
}
