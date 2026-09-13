import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { CATALOG } from "../lib/catalog";

interface AddServiceViewProps {
  enabledIds: string[];
  onAdd: (id: string) => void;
}

/** Pushed view listing catalog services not yet on the dashboard, grouped by category. */
export function AddServiceView({ enabledIds, onAdd }: AddServiceViewProps) {
  const { pop } = useNavigation();
  const available = CATALOG.filter((service) => !enabledIds.includes(service.id));
  const categories = [...new Set(available.map((service) => service.category))];

  return (
    <List searchBarPlaceholder="Add a service">
      <List.EmptyView
        icon={Icon.Check}
        title="All services added"
        description="Every catalog service is on your dashboard."
      />
      {categories.map((category) => (
        <List.Section key={category} title={category}>
          {available
            .filter((service) => service.category === category)
            .map((service) => (
              <List.Item
                key={service.id}
                icon={Icon.PlusCircle}
                title={service.name}
                actions={
                  <ActionPanel>
                    <Action
                      title="Add Service"
                      icon={Icon.Plus}
                      onAction={() => {
                        onAdd(service.id);
                        pop();
                      }}
                    />
                  </ActionPanel>
                }
              />
            ))}
        </List.Section>
      ))}
    </List>
  );
}
