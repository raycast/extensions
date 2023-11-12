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

  function updatePreferences(updateFunction: (preferences: PropertyPreferences) => void) {
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

    updateFunction(data[databaseId]);

    LocalStorage.setItem("CREATE_DATABASE_PAGE_PROPERTY_PREFERENCES", JSON.stringify(data));
    mutate();
  }

  const togglePropertyVisibility = (propertyId: string) =>
    updatePreferences((p) => {
      if (p.visible.includes(propertyId)) {
        p.visible = p.visible.filter((id) => id !== propertyId);
      } else if (p.hidden.includes(propertyId)) {
        p.hidden = p.hidden.filter((id) => id !== propertyId);
      } else {
        p.visible.push(propertyId);
      }
    });


  const toggleShowEndDate = (propertyId: string) =>
    updatePreferences((p) => {
      if (p.showEndDate.includes(propertyId)) {
        p.showEndDate = p.showEndDate.filter((id) => id != propertyId);
      } else {
        p.showEndDate.push(propertyId);
      }
    });


  const moveProperty = (propertyId: string, direction: "up" | "down") =>
    updatePreferences((p) => {
      const index = p.visible.indexOf(propertyId);
      if (direction === "up" && index > 0) {
        const temp = p.visible[index - 1];
        p.visible[index - 1] = propertyId;
        p.visible[index] = temp;
      } else if (direction === "down" && index < p.visible.length - 1) {
        const temp = p.visible[index + 1];
        p.visible[index + 1] = propertyId;
        p.visible[index] = temp;
      }
    });


  return {
    data,
    isLoading,
    visibleProperties: data[databaseId]?.visible,
    togglePropertyVisibility,
    toggleShowEndDate,
    moveUp: (propertyId: string) => moveProperty(propertyId, "up"),
    moveDown: (propertyId: string) => moveProperty(propertyId, "down"),
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
                  {property.type === "date" && (
                    <Action
                      title={data?.[databaseId]?.showEndDate?.includes(property.id) ? "Hide End Date" : "Show End Date"}
                      icon={Icon.Calendar}
                      onAction={() => toggleShowEndDate(property.id)}
                    />
                  )}
                  <Action
                    title="Move Up"
                    icon={Icon.ArrowUp}
                    onAction={() =>  moveUp(property.id)}
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
                accessories={[{ tag: property.type }]}
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
