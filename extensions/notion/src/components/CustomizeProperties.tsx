import { Action, ActionPanel, Icon, List, LocalStorage } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

import { DatabaseProperty, getPropertyIcon } from "../utils/notion";

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

export function useCreateDatabasePagePreferences(databaseId: string | null, properties: DatabaseProperty[]) {
  const { data, isLoading, mutate } = useCachedPromise(async () => {
    const data = await LocalStorage.getItem<string>("CREATE_DATABASE_PAGE_PROPERTY_PREFERENCES");

    let allDatabasePrefs = JSON.parse(data ?? "{}") as DatabasePreferences;

    if (!allDatabasePrefs) {
      allDatabasePrefs = {};
    }
    if (databaseId && !allDatabasePrefs[databaseId]) {
      allDatabasePrefs = {
        [databaseId]: {
          visible: properties.map((property) => property.id),
          hidden: [],
          showEndDate: [],
        },
      };
    }
    return allDatabasePrefs;
  });

  async function togglePropertyVisibility(propertyId: string) {
    if (!data || !databaseId) return;

    if (data[databaseId].visible.includes(propertyId)) {
      data[databaseId].visible = data[databaseId].visible.filter((id) => id !== propertyId);
      data[databaseId].hidden = [...data[databaseId].hidden, propertyId];
    } else if (data[databaseId].hidden.includes(propertyId)) {
      data[databaseId].hidden = data[databaseId].hidden.filter((id) => id !== propertyId);
      data[databaseId].visible = [...data[databaseId].visible, propertyId];
    } else {
      data[databaseId].visible.push(propertyId);
    }

    await LocalStorage.setItem("CREATE_DATABASE_PAGE_PROPERTY_PREFERENCES", JSON.stringify(data));
    mutate();
  }

  async function toggleShowEndDate(propertyId: string) {
    if (!data || !databaseId) return;

    if (data[databaseId].showEndDate.includes(propertyId)) {
      data[databaseId].showEndDate = data[databaseId].showEndDate.filter((id) => id != propertyId);
    } else {
      data[databaseId].showEndDate.push(propertyId);
    }

    await LocalStorage.setItem("CREATE_DATABASE_PAGE_PROPERTY_PREFERENCES", JSON.stringify(data));
    mutate();
  }

  async function moveProperty(propertyId: string, direction: "up" | "down") {
    if (!data || !databaseId) return;

    const index = data[databaseId].visible.indexOf(propertyId);
    if (direction === "up" && index > 0) {
      const temp = data[databaseId].visible[index - 1];
      data[databaseId].visible[index - 1] = propertyId;
      data[databaseId].visible[index] = temp;
    } else if (direction === "down" && index < data[databaseId].visible.length - 1) {
      const temp = data[databaseId].visible[index + 1];
      data[databaseId].visible[index + 1] = propertyId;
      data[databaseId].visible[index] = temp;
    }

    await LocalStorage.setItem("CREATE_DATABASE_PAGE_PROPERTY_PREFERENCES", JSON.stringify(data));
    mutate();
  }

  return {
    data,
    isLoading,
    togglePropertyVisibility,
    toggleShowEndDate,
    moveUp: (propertyId: string) => moveProperty(propertyId, "up"),
    moveDown: (propertyId: string) => moveProperty(propertyId, "down"),
  };
}

export function CustomizeProperty(props: {
  data: DatabasePreferences;
  databaseId: string;
  property: DatabaseProperty;
  togglePropertyVisibility: (propertyId: string) => void;
  toggleShowEndDate: (propertyId: string) => void;
  moveUp: (propertyId: string) => void;
  moveDown: (propertyId: string) => void;
}) {
  const endDateShown = props.data[props.databaseId]?.showEndDate?.includes(props.property.id) ?? false;
  return (
    <List.Item
      key={props.property.id}
      icon={getPropertyIcon(props.property)}
      title={props.property.name}
      accessories={[
        { tag: props.property.type },
        ...(endDateShown && props.property.type === "date" ? [{ tag: "End date shown" }] : [])
      ]}
      actions={
        <ActionPanel>
          <Action
            title={props.data?.[props.databaseId]?.visible.includes(props.property.id) ? "Hide" : "Show"}
            icon={Icon.Eye}
            onAction={() => props.togglePropertyVisibility(props.property.id)}
          />
          {props.property.type === "date" && (
            <Action
              title={
                props.data?.[props.databaseId]?.showEndDate?.includes(props.property.id)
                  ? "Hide End Date"
                  : "Show End Date"
              }
              icon={Icon.Calendar}
              onAction={() => props.toggleShowEndDate(props.property.id)}
            />
          )}
          <Action
            title="Move Up"
            icon={Icon.ArrowUp}
            onAction={() => props.moveUp(props.property.id)}
            shortcut={{ modifiers: ["cmd", "opt"], key: "arrowUp" }}
          />
          <Action
            title="Move Down"
            icon={Icon.ArrowDown}
            onAction={() => props.moveDown(props.property.id)}
            shortcut={{ modifiers: ["cmd", "opt"], key: "arrowDown" }}
          />
        </ActionPanel>
      }
    />
  );
}

export function CustomizeProperties(props: { databaseId: string; databaseProperties: DatabaseProperty[] }) {
  const properties = props.databaseProperties;
  const databaseId = props.databaseId;

  const { data, isLoading, togglePropertyVisibility, toggleShowEndDate, moveUp, moveDown } =
    useCreateDatabasePagePreferences(databaseId, properties);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter properties by name...">
      <List.Section title="Visible Properties">
        {data?.[databaseId]?.visible.map((propertyId) => {
          const property = properties.find((p) => p.id == propertyId);
          if (!property) return null;
          return <CustomizeProperty key={property.id} {...{ data, databaseId, property, togglePropertyVisibility, toggleShowEndDate, moveUp, moveDown }} />;
        })}
      </List.Section>
      <List.Section title="Hidden Properties">
        {data?.[databaseId]?.hidden.map((propertyId) => {
          const property = properties.find((p) => p.id == propertyId);
          if (!property) return null;
          return <CustomizeProperty key={property.id} {...{ data, databaseId, property, togglePropertyVisibility, toggleShowEndDate, moveUp, moveDown }} />;
        })}
      </List.Section>
    </List>
  );
}
