import { useState } from "react";
import { List, ActionPanel, Action, Icon } from "@raycast/api";
import {
  getComponentIcon,
  getComponentTypeLabel,
  getDisplayName,
  getFormattedComponentName,
  openDocumentation,
} from "./utils/component";
import { getAllComponents, filterComponents, sortComponentsByName } from "./utils/search";
import { showFailureToast } from "@raycast/utils";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [components] = useState(() => {
    const comps = getAllComponents();
    setIsLoading(false);
    return comps;
  });

  // Filter components based on search text and selected type
  const filteredComponents = filterComponents(components, searchText, selectedType);

  // Sort components alphabetically
  const sortedComponents = sortComponentsByName(filteredComponents);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Nuxt UI components..."
      throttle
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Type" value={selectedType || ""} onChange={setSelectedType}>
          <List.Dropdown.Item title="All Types" value="" />
          <List.Dropdown.Item title="Base Components" value="base" />
          <List.Dropdown.Item title="Pro Components" value="pro" />
          <List.Dropdown.Item title="Prose Components" value="prose" />
        </List.Dropdown>
      }
    >
      {sortedComponents.map((component) => {
        return (
          <List.Item
            key={`${component.type}-${component.name}`}
            icon={getComponentIcon(component.type)}
            title={getDisplayName(component)}
            subtitle={getComponentTypeLabel(component.type)}
            actions={
              <ActionPanel>
                <Action
                  title="Open Documentation"
                  icon={Icon.Book}
                  onAction={async () => {
                    try {
                      await openDocumentation(component, false);
                    } catch (error) {
                      await showFailureToast(error, { title: "Failed to open documentation" });
                    }
                  }}
                />
                <Action
                  title="Open Theme Documentation"
                  icon={Icon.Brush}
                  onAction={async () => {
                    try {
                      await openDocumentation(component, true);
                    } catch (error) {
                      await showFailureToast(error, { title: "Failed to open documentation" });
                    }
                  }}
                />
                <Action.CopyToClipboard title="Copy Component Name" content={getFormattedComponentName(component)} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
