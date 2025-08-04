import { List, ActionPanel, Action, getPreferenceValues } from "@raycast/api";
import { useState, useEffect } from "react";
import path from "path";
import { Preferences, getDirectories, openInObsidian, searchJohnnyDecimal } from "./utils";

export default function Command() {
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const { rootFolder } = getPreferenceValues<Preferences>();

  useEffect(() => {
    const directories = getDirectories(rootFolder, 1); // Use 1 for areas, 2 for categories, 3 for items
    const sortedResults = searchJohnnyDecimal(directories, searchTerm).sort((a, b) =>
      path.basename(a).localeCompare(path.basename(b), undefined, { numeric: true, sensitivity: "base" }),
    );
    setSearchResults(sortedResults);
  }, [searchTerm]);

  return (
    <List onSearchTextChange={setSearchTerm} searchBarPlaceholder="Search Johnny.Decimal Areas..." throttle>
      <List.Section title="Areas">
        {searchResults.map((result, index) => (
          <List.Item
            key={index}
            title={path.basename(result)}
            actions={
              <ActionPanel>
                <Action title="Open in Obsidian" onAction={() => openInObsidian(result, rootFolder)} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
