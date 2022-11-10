import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import useSWR from "swr";

import heroku, { simplifyCustomResponse } from "./heroku";

import AppBuilds from "./AppBuilds";
import ConfigVars from "./ConfigVars";
import AppLogSession from "./AppLogSession";
import { useEffect } from "react";

export default function Command() {
  const { data, error } = useSWR("apps", () => heroku.requests.getApps({}).then(simplifyCustomResponse));

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error.message,
      });
    }
  }, [error]);

  if (!data) {
    return <List isLoading />;
  }

  return (
    <List>
      {data
        .sort(
          (a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()
        )
        .map((app) => (
          <List.Item
            title={app.name}
            key={app.id}
            accessories={[
              {
                text: app.updated_at ? new Date(app.updated_at).toLocaleString() : "",
              },
            ]}
            subtitle={app.web_url}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  url={`https://dashboard.heroku.com/apps/${app.name}`}
                  title="Open App Dashboard"
                />
                <Action.OpenInBrowser url={app.web_url} title="Open App" icon={Icon.Desktop} />
                <Action.Push
                  title="Show Builds"
                  icon={Icon.Hammer}
                  target={<AppBuilds appId={app.id} key={app.id} appName={app.name} />}
                  shortcut={{
                    modifiers: ["cmd"],
                    key: "b",
                  }}
                />
                <Action.Push
                  icon={Icon.Terminal}
                  title="Show App Logs"
                  shortcut={{ modifiers: ["cmd"], key: "l" }}
                  target={<AppLogSession appId={app.id} />}
                />
                <Action.CopyToClipboard title="Copy App Name" content={app.name} />
                <ActionPanel.Section title="Project Settings">
                  <Action.Push
                    icon={Icon.Gear}
                    title="Environment Variable"
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                    target={<ConfigVars appId={app.id} appName={app.name} />}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
