import { ActionPanel, Color, ImageLike } from "@raycast/api";
import { DatabaseProperty } from "../utils/notion";

export function ActionSetVisibleProperties(props: {
  title?: string;
  icon?: ImageLike;
  databaseProperties: DatabaseProperty[];
  selectedPropertiesIds?: string[];
  onSelect: (propertyId: string) => void;
  onUnselect: (propertyId: string) => void;
}): JSX.Element {
  const title = props.title ? props.title : "Show / Hide Properties...";
  const icon = props.icon ? props.icon : "./icon/shown.png";
  const selectedPropertiesIds = props.selectedPropertiesIds ? props.selectedPropertiesIds : [];
  const databaseProperties = props.databaseProperties;
  const onSelect = props.onSelect;
  const onUnselect = props.onUnselect;

  return (
    <ActionPanel.Submenu title={title} icon={icon}>
      <ActionPanel.Section>
        {selectedPropertiesIds?.map(function (propertyId) {
          const property = databaseProperties.filter(function (dp) {
            return dp.id === propertyId;
          })[0];
          if (!property) return;

          return (
            <ActionPanel.Item
              key={`selected-property-${property.id}`}
              icon={"./icon/" + property.type + ".png"}
              title={property.name + "  ✓"}
              onAction={function () {
                onUnselect(property.id);
              }}
            />
          );
        })}
      </ActionPanel.Section>
      <ActionPanel.Section>
        {databaseProperties?.map(function (dp: DatabaseProperty) {
          if (!selectedPropertiesIds.includes(dp.id)) {
            return (
              <ActionPanel.Item
                key={`unselected-property-${dp.id}`}
                icon={{ source: "./icon/" + dp.type + "_secondary.png", tintColor: Color.SecondaryText }}
                title={dp.name}
                onAction={function () {
                  onSelect(dp.id);
                }}
              />
            );
          }
        })}
      </ActionPanel.Section>
    </ActionPanel.Submenu>
  );
}
