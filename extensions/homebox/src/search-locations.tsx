import { Icon, List } from "@raycast/api";
import { useLocations } from "./hooks";

export default function SearchLocations() {
  const { isLoading, locations } = useLocations();
  return (
    <List isLoading={isLoading}>
      {locations.map((location) => (
        <List.Item key={location.id} icon={Icon.Pin} title={location.name} subtitle={location.description} />
      ))}
    </List>
  );
}
