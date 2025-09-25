import { useMemo, useState } from "react";
import { List, ActionPanel, Action, Icon } from "@raycast/api";
import {
  getComponentIcon,
  getComponentTypeLabel,
  getDisplayName,
  getFormattedComponentName,
  openDocumentation,
} from "./utils/components";
import { getAllComponents, filterComponents, sortComponentsByName } from "./utils/search";
import { showFailureToast } from "@raycast/utils";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [components] = useState(() => {
    const comps = getAllComponents();
    setIsLoading(false);
    return comps;
  });

  // Filter components based on search text
  const filteredComponents = useMemo(() => filterComponents(components, searchText, null), [components, searchText]);

  // Split into sections and sort alphabetically within each
  const baseComponents = useMemo(
    () => sortComponentsByName(filteredComponents.filter((c) => c.type === "base")),
    [filteredComponents],
  );
  const prose = useMemo(
    () => sortComponentsByName(filteredComponents.filter((c) => c.type === "prose")),
    [filteredComponents],
  );

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Nuxt UI components..."
      throttle
    >
      <List.Section title="Components">
        {baseComponents.map((component) => (
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
        ))}
      </List.Section>
      <List.Section title="Prose Components">
        {prose.map((component) => (
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
        ))}
      </List.Section>
    </List>
  );
}
