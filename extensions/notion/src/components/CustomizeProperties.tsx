import { Action, ActionPanel, List, LocalStorage } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

import { DatabaseProperty } from "../utils/notion";

/*

stored data format:

{
  "databaseId": {
    "visible": ["propertyId1", "propertyId2"]
    // hidden properties are everything else
    showEndDate: ["propertyId1", "propertyId2"] // for date property only
  }
}
*/

export type PropertyPreferences = {
  visible: string[];
  showEndDate: string[]; // for date property only
};

export type DatabasePreferences = {
  [databaseId: string]: PropertyPreferences;
};

// export function CustomizeProperty(props: { databaseId: string, databaseProperties: DatabaseProperty[], togglePropertyVisibility: (propertyId: string) => void, toggleShowEndDate: (propertyId: string) => void, moveUp: (propertyId: string) => void, moveDown: (propertyId: string) => void }) {
// }

export function CustomizeProperties(props: { databaseId: string; databaseProperties: DatabaseProperty[] }) {
  const properties = props.databaseProperties;
  const databaseId = props.databaseId;

  let { data, isLoading, mutate } = useCachedPromise(async () => {
    const data = await LocalStorage.getItem<string>("CREATE_DATABASE_PAGE_PROPERTY_PREFERENCES");

    const allDatabasePrefs = JSON.parse(data ?? "{}") as DatabasePreferences;

    return allDatabasePrefs;
  });
  console.log(data);
  if (!data) {
    data = {};
  }
  if (!data[databaseId]) {
    data = {
      [databaseId]: {
        visible: properties.map((property) => property.id),
        showEndDate: [],
      },
    };
  }

  const visibleProperties = data[databaseId]?.visible;
  console.log("a", visibleProperties);

  function togglePropertyVisibility(propertyId: string) {
    const newPrefs = { ...data };

    // if doesn't have the key databaseId, add it
    if (!newPrefs[databaseId]) {
      newPrefs[databaseId] = { visible: [], showEndDate: [] };
    }

    if (newPrefs[databaseId].visible.includes(propertyId)) {
      newPrefs[databaseId].visible = newPrefs[databaseId].visible.filter((id) => id !== propertyId);
    } else {
      newPrefs[databaseId].visible.push(propertyId);
    }

    LocalStorage.setItem("CREATE_DATABASE_PAGE_PROPERTY_PREFERENCES", JSON.stringify(newPrefs));
    mutate();
  }

  function toggleShowEndDate(propertyId: string) {
    const newPrefs = { ...data };

    if (newPrefs[databaseId].showEndDate.includes(propertyId)) {
      newPrefs[databaseId].showEndDate = newPrefs[databaseId].showEndDate.filter((id) => id != propertyId);
    } else {
      newPrefs[databaseId].showEndDate.push(propertyId);
    }

    LocalStorage.setItem("CREATE_DATABASE_PAGE_PROPERTY_PREFERENCES", JSON.stringify(newPrefs));
    mutate();
  }

  function moveUp(propertyId: string) {
    const newPrefs = { ...data };

    const index = newPrefs[databaseId].visible.indexOf(propertyId);
    if (index > 0) {
      const temp = newPrefs[databaseId].visible[index - 1];
      newPrefs[databaseId].visible[index - 1] = propertyId;
      newPrefs[databaseId].visible[index] = temp;
    }

    LocalStorage.setItem("CREATE_DATABASE_PAGE_PROPERTY_PREFERENCES", JSON.stringify(newPrefs));
    mutate();
  }

  function moveDown(propertyId: string) {
    const newPrefs = { ...data };

    const index = newPrefs[databaseId].visible.indexOf(propertyId);
    if (index < newPrefs[databaseId].visible.length - 1) {
      const temp = newPrefs[databaseId].visible[index + 1];
      newPrefs[databaseId].visible[index + 1] = propertyId;
      newPrefs[databaseId].visible[index] = temp;
    }

    LocalStorage.setItem("CREATE_DATABASE_PAGE_PROPERTY_PREFERENCES", JSON.stringify(newPrefs));
    mutate();
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter properties by name...">
      <List.Section title="Visible properties">
        {properties
          .filter((property) => visibleProperties.includes(property.id))
          .map((property) => {
            return (
              <List.Item
                key={property.id}
                title={property.name}
                accessories={[{ text: property.type }]}
                actions={
                  <ActionPanel>
                    <Action title="Hide" onAction={() => togglePropertyVisibility(property.id)} />
                    <Action
                      title="Move Up"
                      onAction={() => moveUp(property.id)}
                      shortcut={{ modifiers: ["cmd", "opt"], key: "arrowUp" }}
                    />
                    <Action
                      title="Move Down"
                      onAction={() => moveDown(property.id)}
                      shortcut={{ modifiers: ["cmd", "opt"], key: "arrowDown" }}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
      </List.Section>
      <List.Section title="Hidden properties">
        {properties
          .filter((property) => !visibleProperties.includes(property.id))
          .map((property) => {
            return (
              <List.Item
                key={property.id}
                title={property.name}
                accessories={[{ text: property.type }]}
                actions={
                  <ActionPanel>
                    <Action title="Show" onAction={() => togglePropertyVisibility(property.id)} />
                  </ActionPanel>
                }
              />
            );
          })}
      </List.Section>
    </List>
  );
}
