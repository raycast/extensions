import { Action, ActionPanel, Detail, Icon, List } from "@raycast/api";
import { useDroplets } from "./client";
import DropletDetail from "./details/DropletDetail";
import { DO } from "./config";

export default function Command() {
  const { data, error, isLoading } = useDroplets();
  const droplets = data?.droplets || [];

  if (error) {
    return <Detail markdown={`Failed to list droplets: ${error.message}`} />;
  }

  return (
    <List isLoading={isLoading}>
      {!isLoading && !droplets.length && (
        <List.EmptyView
          icon={DO.LOGO}
          title="Droplets in minutes"
          description="Create your first droplet now"
          actions={
            <ActionPanel>
              <Action.OpenInBrowser icon={DO.ICON} title="Create Droplet" url={DO.LINKS.droplets.new} />
            </ActionPanel>
          }
        />
      )}
      {droplets.map((droplet) => (
        <List.Item
          key={droplet.id}
          title={droplet.name}
          subtitle={droplet.region.slug}
          accessories={[...droplet.tags.map((tag) => ({ tag }))]}
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.Eye} title="View Details" target={<DropletDetail droplet={droplet} />} />
              <Action.OpenInBrowser url={`https://cloud.digitalocean.com/droplets/${droplet.id}`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
