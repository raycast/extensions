import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { memo } from "react";
import { MacApp } from "../types";

interface AppItemProps {
  app: MacApp;
}

/**
 * Component for rendering a single app item in the list
 */
export const AppItem = memo(function AppItem({ app }: AppItemProps) {
  return (
    <List.Item
      key={app.name}
      title={app.name}
      subtitle={app.description}
      icon={app.iconUrl || Icon.AppWindow}
      accessories={[
        {
          text: app.categories.join(", "),
          tooltip: "Categories",
          icon: Icon.Tag,
        },
      ]}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open GitHub Repository" url={app.githubUrl} icon={Icon.CodeBlock} />
          <Action.CopyToClipboard
            title="Copy GitHub URL"
            content={app.githubUrl}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy App Name"
            content={app.name}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <Action.OpenInBrowser
            title="Open Indie Goodies Page"
            url={"https://indiegoodies.com/awesome-open-source-mac-apps"}
            icon={Icon.AppWindowGrid3x3}
          />
          <Action.OpenInBrowser
            title="Submit New App"
            url="https://airtable.com/apphGKlDu35M7Sjt9/shrqPdSfPH7UXywgx"
            icon={Icon.Plus}
          />
        </ActionPanel>
      }
    />
  );
});
