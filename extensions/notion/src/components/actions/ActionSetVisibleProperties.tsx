import { ActionPanel, Color, Action, Icon } from "@raycast/api";

import { getPropertyIcon, DatabaseProperty } from "../../utils/notion";

export function ActionSetVisibleProperties(props: {
  databaseProperties: DatabaseProperty[];
  selectedPropertiesIds?: string[];
  onSelect: (propertyId: string) => void;
  onUnselect: (propertyId: string) => void;
}) {
  const { databaseProperties, onSelect, onUnselect, selectedPropertiesIds = [] } = props;

  const selectedProperties = selectedPropertiesIds.map((id) => databaseProperties.find((dp) => dp.id === id));
  const unselectedProperties = databaseProperties.filter((dp) => !selectedPropertiesIds.includes(dp.id));

  return (
    <ActionPanel.Submenu
      title="Show/Hide Properties"
      icon={Icon.Eye}
      shortcut={{ modifiers: ["cmd", "opt", "shift"], key: "p" }}
    >
      <ActionPanel.Section>
        {selectedProperties.map(
          (property) =>
            property && (
              <Action
                key={`selected-property-${property.id}`}
                icon={getPropertyIcon(property)}
                title={`${property.name}  ✓`}
                onAction={() => onUnselect(property.id)}
              />
            ),
        )}
      </ActionPanel.Section>
      <ActionPanel.Section>
        {unselectedProperties.map((dp) => {
          return (
            <Action
              key={`unselected-property-${dp.id}`}
              icon={{ source: getPropertyIcon(dp), tintColor: Color.SecondaryText }}
              title={dp.name}
              onAction={() => onSelect(dp.id)}
            />
          );
        })}
      </ActionPanel.Section>
    </ActionPanel.Submenu>
  );
}
