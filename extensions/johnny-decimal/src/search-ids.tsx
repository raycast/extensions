import { List, ActionPanel, Action, getPreferenceValues, open } from "@raycast/api";
import { useState, useEffect } from "react";
import path from "path";
import { Preferences, getDirectories, searchJohnnyDecimal } from "./utils";

export default function Command() {
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const { rootFolder } = getPreferenceValues<Preferences>();

  useEffect(() => {
    const directories = getDirectories(rootFolder, 3); // Use 1 for areas, 2 for categories, 3 for items
    const sortedResults = searchJohnnyDecimal(directories, searchTerm).sort((a, b) =>
      path.basename(a).localeCompare(path.basename(b), undefined, { numeric: true, sensitivity: "base" }),
    );
    setSearchResults(sortedResults);
  }, [searchTerm]);

  return (
    <List onSearchTextChange={setSearchTerm} searchBarPlaceholder="Search Johnny.Decimal Items..." throttle>
      <List.Section title="Items">
        {searchResults.map((result, index) => (
          <List.Item
            key={index}
            title={path.basename(result)}
            actions={
              <ActionPanel>
                <Action title="Open in Finder" onAction={() => open(result)} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
