import { Action, ActionPanel, Icon, Keyboard, List, confirmAlert } from "@raycast/api";

import LocationForm from "./components/LocationForm";
import useLocations from "./hooks/useLocations";

export default function ManageLocations() {
  const { locations, addLocation, editLocation, deleteLocation } = useLocations();

  return (
    <List>
      {locations.map((location) => {
        return (
          <List.Item
            key={location.id}
            icon={location.icon}
            title={location.name}
            subtitle={location.address}
            actions={
              <ActionPanel>
                <Action.Push
                  icon={Icon.Pencil}
                  title="Edit Location"
                  target={<LocationForm onSubmit={editLocation} location={location} />}
                />
                <Action.Push icon={Icon.Plus} title="Add Location" target={<LocationForm onSubmit={addLocation} />} />
                <Action
                  title="Delete Location"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={async () => {
                    if (
                      await confirmAlert({
                        title: "Remove Location",
                        message: `Are you sure you want to delete "${location.name}"?`,
                      })
                    ) {
                      await deleteLocation(location.id);
                    }
                  }}
                />
              </ActionPanel>
            }
          />
        );
      })}

      <List.EmptyView
        title="You don't have any saved locations."
        description="Press ⏎ to create your first location"
        actions={
          <ActionPanel>
            <Action.Push icon={Icon.Plus} title="Add Location" target={<LocationForm onSubmit={addLocation} />} />
          </ActionPanel>
        }
      />
    </List>
  );
}
