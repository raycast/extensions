import { ActionPanel, Color, Action, Image } from "@raycast/api";
import { DatabaseProperty } from "../../utils/types";

/**
 * An action to set the properties that are visible in a form/view
 */
export function ActionSetVisibleProperties(props: {
  title?: string;
  icon?: Image.ImageLike;
  databaseProperties: DatabaseProperty[];
  selectedPropertiesIds?: string[];
  onSelect: (propertyId: string) => void;
  onUnselect: (propertyId: string) => void;
}): JSX.Element {
  const {
    databaseProperties,
    onSelect,
    onUnselect,
    title = "Show / Hide Properties...",
    icon = { source: "./icon/shown.png", tintColor: Color.PrimaryText },
    selectedPropertiesIds = [],
  } = props;

  return (
    <ActionPanel.Submenu title={title} icon={icon}>
      <ActionPanel.Section>
        {selectedPropertiesIds?.map((propertyId) => {
          const property = databaseProperties.find((dp) => dp.id === propertyId);
          if (!property) return;

          return (
            <Action
              key={`selected-property-${property.id}`}
              icon={{ source: "./icon/" + property.type + ".png", tintColor: Color.PrimaryText }}
              title={property.name + "  ✓"}
              onAction={() => onUnselect(property.id)}
            />
          );
        })}
      </ActionPanel.Section>
      <ActionPanel.Section>
        {databaseProperties
          ?.filter((dp) => !selectedPropertiesIds.includes(dp.id))
          .map((dp) => (
            <Action
              key={`unselected-property-${dp.id}`}
              icon={{ source: "./icon/" + dp.type + "_secondary.png", tintColor: Color.SecondaryText }}
              title={dp.name}
              onAction={() => onSelect(dp.id)}
            />
          ))}
      </ActionPanel.Section>
    </ActionPanel.Submenu>
  );
}
