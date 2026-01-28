import { ActionPanel, Action, Icon } from "@raycast/api";

import { DatabaseProperty } from "../../utils/notion";

export function ActionSetOrderProperties(props: {
  databaseProperties: DatabaseProperty[];
  propertiesOrder: string[];
  onChangeOrder: (propertyIds: string[]) => void;
}) {
  const { databaseProperties, propertiesOrder, onChangeOrder } = props;

  const changeOrder = (propertyId: string, direction: "up" | "down") => {
    const index = propertiesOrder.indexOf(propertyId);

    if (index === -1) return;

    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= propertiesOrder.length) return propertiesOrder;

    const newOrder = propertiesOrder.slice();
    [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];

    onChangeOrder(newOrder);
  };

  const propertiesNameById = databaseProperties.reduce(
    (acc, property) => {
      acc[property.id] = property.name;
      return acc;
    },
    {} as Record<string, string>,
  );

  return (
    <ActionPanel.Submenu
      title="Change Properties Order"
      icon={Icon.ChevronUpDown}
      shortcut={{ modifiers: ["cmd", "opt", "shift"], key: "o" }}
    >
      {propertiesOrder.map((propertyId, index) => {
        const propertyName = propertiesNameById[propertyId];

        return (
          propertyName && (
            <ActionPanel.Section key={propertyId}>
              {!!index && (
                <Action icon={Icon.ChevronUp} title={propertyName} onAction={() => changeOrder(propertyId, "up")} />
              )}
              {index < databaseProperties.length - 1 && (
                <Action icon={Icon.ChevronDown} title={propertyName} onAction={() => changeOrder(propertyId, "down")} />
              )}
            </ActionPanel.Section>
          )
        );
      })}
    </ActionPanel.Submenu>
  );
}
