import { Action, ActionPanel, Icon, List, LocalStorage } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

import { DatabaseProperty } from "../utils/notion";

/*

stored data format:

{
  "databaseId": {
    "visible": ["propertyId1", "propertyId2"]
    "hidden": ["propertyId1", "propertyId2"]
    showEndDate: ["propertyId1", "propertyId2"] // for date property only
  }
}
*/

export type PropertyPreferences = {
  visible: string[];
  hidden: string[];
  showEndDate: string[]; // for date property only
};

export type DatabasePreferences = {
  [databaseId: string]: PropertyPreferences;
};

// export function CustomizeProperty(props: { databaseId: string, databaseProperties: DatabaseProperty[], togglePropertyVisibility: (propertyId: string) => void, toggleShowEndDate: (propertyId: string) => void, moveUp: (propertyId: string) => void, moveDown: (propertyId: string) => void }) {
// }

export function useCreateDatabasePagePreferences(databaseId: string, properties: DatabaseProperty[]) {
  let { data, isLoading, mutate } = useCachedPromise(async () => {
    // await LocalStorage.removeItem("CREATE_DATABASE_PAGE_PROPERTY_PREFERENCES");
    const data = await LocalStorage.getItem<string>("CREATE_DATABASE_PAGE_PROPERTY_PREFERENCES");

    const allDatabasePrefs = JSON.parse(data ?? "{}") as DatabasePreferences;

    return allDatabasePrefs;
  });

  if (!data) {
    data = {};
  }
  if (!data[databaseId]) {
    data = {
      [databaseId]: {
        visible: properties.map((property) => property.id),
        hidden: [],
        showEndDate: [],
      },
    };
  }

  const visibleProperties = data[databaseId]?.visible;

  function togglePropertyVisibility(propertyId: string) {
    if (!data) {
      data = {};
    }
    if (!data[databaseId]) {
      data = {
        [databaseId]: {
          visible: properties.map((property) => property.id),
          hidden: [],
          showEndDate: [],
        },
      };
    }

    if (data[databaseId].visible.includes(propertyId)) {
      data[databaseId].visible = data[databaseId].visible.filter((id) => id !== propertyId);
    } else if (data[databaseId].hidden.includes(propertyId)) {
      data[databaseId].hidden = data[databaseId].hidden.filter((id) => id !== propertyId);
    } else {
      data[databaseId].visible.push(propertyId);
    }

    LocalStorage.setItem("CREATE_DATABASE_PAGE_PROPERTY_PREFERENCES", JSON.stringify(data));
    mutate();
  }

  function toggleShowEndDate(propertyId: string) {
    if (!data) {
      data = {};
    }
    if (!data[databaseId]) {
      data = {
        [databaseId]: {
          visible: properties.map((property) => property.id),
          hidden: [],
          showEndDate: [],
        },
      };
    }

    if (data[databaseId].showEndDate.includes(propertyId)) {
      data[databaseId].showEndDate = data[databaseId].showEndDate.filter((id) => id != propertyId);
    } else {
      data[databaseId].showEndDate.push(propertyId);
    }

    LocalStorage.setItem("CREATE_DATABASE_PAGE_PROPERTY_PREFERENCES", JSON.stringify(data));
    mutate();
  }

  function moveUp(propertyId: string) {
    if (!data) {
      data = {};
    }
    if (!data[databaseId]) {
      data = {
        [databaseId]: {
          visible: properties.map((property) => property.id),
          hidden: [],
          showEndDate: [],
        },
      };
    }

    const index = data[databaseId].visible.indexOf(propertyId);
    if (index > 0) {
      const temp = data[databaseId].visible[index - 1];
      data[databaseId].visible[index - 1] = propertyId;
      data[databaseId].visible[index] = temp;
    }

    LocalStorage.setItem("CREATE_DATABASE_PAGE_PROPERTY_PREFERENCES", JSON.stringify(data));
    mutate();
  }

  function moveDown(propertyId: string) {
    if (!data) {
      data = {};
    }
    if (!data[databaseId]) {
      data = {
        [databaseId]: {
          visible: properties.map((property) => property.id),
          hidden: [],
          showEndDate: [],
        },
      };
    }

    const index = data[databaseId].visible.indexOf(propertyId);
    if (index < data[databaseId].visible.length - 1) {
      const temp = data[databaseId].visible[index + 1];
      data[databaseId].visible[index + 1] = propertyId;
      data[databaseId].visible[index] = temp;
    }

    LocalStorage.setItem("CREATE_DATABASE_PAGE_PROPERTY_PREFERENCES", JSON.stringify(data));
    mutate();
  }

  return {
    data,
    isLoading,
    visibleProperties,
    togglePropertyVisibility,
    toggleShowEndDate,
    moveUp,
    moveDown,
  };
}

export function CustomizeProperties(props: { databaseId: string; databaseProperties: DatabaseProperty[] }) {
  const properties = props.databaseProperties;
  const databaseId = props.databaseId;

  const { data, isLoading, visibleProperties, togglePropertyVisibility, toggleShowEndDate, moveUp, moveDown } =
    useCreateDatabasePagePreferences(databaseId, properties);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter properties by name...">
      <List.Section title="Visible Properties">
        {visibleProperties.map((propertyId) => {
          const property = properties.find((p) => p.id == propertyId);
          if (!property) return null;
          return (
            <List.Item
              key={property.id}
              title={property.name}
              accessories={[{ tag: property.type }]}
              actions={
                <ActionPanel>
                  <Action title="Hide" icon={Icon.EyeDisabled} onAction={() => togglePropertyVisibility(property.id)} />
                  <Action
                    title="Move Up"
                    icon={Icon.ArrowUp}
                    onAction={() => {
                      moveUp(property.id);
                    }}
                    shortcut={{ modifiers: ["cmd", "opt"], key: "arrowUp" }}
                  />
                  <Action
                    title="Move Down"
                    icon={Icon.ArrowDown}
                    onAction={() => moveDown(property.id)}
                    shortcut={{ modifiers: ["cmd", "opt"], key: "arrowDown" }}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
      <List.Section title="Hidden Properties">
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
                    <Action title="Show" icon={Icon.Eye} onAction={() => togglePropertyVisibility(property.id)} />
                  </ActionPanel>
                }
              />
            );
          })}
      </List.Section>
    </List>
  );
}
