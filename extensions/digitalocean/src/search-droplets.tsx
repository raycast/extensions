import { Action, ActionPanel, Detail, List } from "@raycast/api";
import { useDroplets } from "./client";
import DropletDetail from "./details/DropletDetail";

export default function Command() {
  const { data, error, isLoading } = useDroplets();

  if (error) {
    return <Detail markdown={`Failed to list droplets: ${error.message}`} />;
  }

  return (
    <List isLoading={isLoading}>
      {data?.droplets?.map((droplet) => (
        <List.Item
          key={droplet.id}
          title={droplet.name}
          subtitle={droplet.region.slug}
          actions={
            <ActionPanel>
              <Action.Push title="View Details" target={<DropletDetail droplet={droplet} />} />
              <Action.OpenInBrowser url={`https://cloud.digitalocean.com/droplets/${droplet.id}`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
