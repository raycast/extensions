import { useEffect } from "react";
import { Action, ActionPanel, Grid, Icon, List, showToast, Toast, Keyboard } from "@raycast/api";
import { usePlugins } from "./lib/plugins";
import { layout } from "./lib/preferences";

export default function ShowPlugins() {
  const { plugins, isLoading, error } = usePlugins();

  useEffect(() => {
    if (error) showToast(Toast.Style.Failure, "Failed to load plugins");
  }, [error]);

  const emptyTitle = error ? "Failed to load plugins" : "No installed plugins found";
  const emptyDescription = error
    ? "Make sure lazy-lock.json is readable and try again."
    : "Install plugins with lazy.nvim and they will show up here.";
  const emptyIcon = error ? Icon.ExclamationMark : Icon.Plug;

  if (layout === "grid") {
    return (
      <Grid isLoading={isLoading} searchBarPlaceholder="Search installed plugins..." columns={5}>
        <Grid.EmptyView icon={emptyIcon} title={emptyTitle} description={emptyDescription} />
        <Grid.Section title="Installed Plugins">
          {plugins.map((plugin) => (
            <Grid.Item
              key={plugin.name}
              title={plugin.name}
              subtitle={plugin.branch}
              content={Icon.Plug}
              keywords={[plugin.commit.slice(0, 7), plugin.branch]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    {plugin.githubUrl && (
                      <Action.OpenInBrowser
                        title="Open GitHub Page"
                        url={plugin.githubUrl}
                        shortcut={Keyboard.Shortcut.Common.Open}
                      />
                    )}
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action.CopyToClipboard
                      title="Copy Plugin Name"
                      content={plugin.name}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                    <Action.CopyToClipboard
                      title="Copy Commit Hash"
                      content={plugin.commit}
                      shortcut={Keyboard.Shortcut.Common.Copy}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </Grid.Section>
      </Grid>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search installed plugins...">
      <List.EmptyView icon={emptyIcon} title={emptyTitle} description={emptyDescription} />
      <List.Section title="Installed Plugins" subtitle={`${plugins.length}`}>
        {plugins.map((plugin) => (
          <List.Item
            key={plugin.name}
            title={plugin.name}
            subtitle={plugin.branch}
            icon={Icon.Plug}
            accessories={[
              {
                tag: plugin.commit.slice(0, 7),
                tooltip: `Commit: ${plugin.commit}`,
              },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  {plugin.githubUrl && (
                    <Action.OpenInBrowser
                      title="Open GitHub Page"
                      url={plugin.githubUrl}
                      shortcut={Keyboard.Shortcut.Common.Open}
                    />
                  )}
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.CopyToClipboard
                    title="Copy Plugin Name"
                    content={plugin.name}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Commit Hash"
                    content={plugin.commit}
                    shortcut={Keyboard.Shortcut.Common.Copy}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
