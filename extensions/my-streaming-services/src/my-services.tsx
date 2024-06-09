import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import SERVICES from "./services.json";

export default function MyServices() {
  const { value: services, setValue, isLoading } = useLocalStorage("services", SERVICES);

  async function toggleService(id: string) {
    const newServices =
      services?.map((service) => (service.id === id ? { ...service, active: !service.active } : service)) ?? [];
    await setValue(newServices);
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search for services">
      {services?.map((service) => (
        <List.Item
          icon={service.icon}
          key={service.id}
          title={service.name}
          accessories={[{ icon: service.active ? { source: Icon.Checkmark, tintColor: Color.Green } : Icon.Circle }]}
          actions={
            <ActionPanel>
              <Action title={service.active ? "Inactive" : "Active"} onAction={() => toggleService(service.id)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
