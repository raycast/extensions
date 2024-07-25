import { Action, ActionPanel, Color, Detail, Icon, List } from "@raycast/api";
import { useApps } from "./client";

export default function Command() {
  const { data, error, isLoading } = useApps();

  if (error) {
    return <Detail markdown={`Failed to list apps: ${error.message}`} />;
  }

  return (
    <List isLoading={isLoading}>
      {data?.apps.map((app) => (
        <List.Item
          key={app.id}
          icon={{ source: Icon.Dot, tintColor: app.live_url ? Color.Green : Color.Blue }}
          title={app.spec.name}
          subtitle={app.region.slug}
          accessories={[
            { date: new Date(app.created_at) }
          ]}
          actions={
            <ActionPanel>
              {app.live_url && <Action.OpenInBrowser title="Visit Live URL" url={app.live_url} />}
              <Action.OpenInBrowser url={`https://cloud.digitalocean.com/apps/${app.id}`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
