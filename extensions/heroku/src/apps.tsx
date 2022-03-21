import { Action, ActionPanel, Icon, List } from "@raycast/api";
import useSWR from "swr";
import AppBuilds from "./AppBuilds";
import heroku, { simplifyCustomResponse } from "./heroku";

export default function Command() {
  const { data, error } = useSWR("apps", () => heroku.requests.getApps({}).then(simplifyCustomResponse));

  if (!data) {
    return <List isLoading />;
  }

  return (
    <List>
      {data
        .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())
        .map((app) => (
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
                <Action.Push
                  title="Show Builds"
                  icon={Icon.Hammer}
                  target={<AppBuilds appId={app.id} key={app.id} />}
                />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
