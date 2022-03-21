import { Action, ActionPanel, Icon, List } from "@raycast/api";
import useSWR from "swr";
import heroku, { simplifyCustomResponse } from "./heroku";

export default function Command() {
  const { data, error } = useSWR("apps", () => heroku.requests.getApps({}).then(simplifyCustomResponse));

  if (!data) {
    return <List isLoading />;
  }

  return (
    <List>
      {data.map((app) => (
        <List.Item
          title={app.name}
          key={app.id}
          icon={Icon.Desktop}
          accessoryTitle={app.updated_at ? `Updated at ${new Date(app.updated_at).toLocaleString()}` : ""}
          subtitle={app.stack.name}
          accessoryIcon={Icon.Calendar}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={app.web_url} title="Open App in Browser" />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
