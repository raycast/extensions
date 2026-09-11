import { workspaceTitle } from "./lib/workspaces";
import { WorkspaceAction } from "./components/workspace-command";
import { withWorkspace } from "./components/workspace-command";
import { Keyboard, Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise, showFailureToast } from "@raycast/utils";
import { EditSavedTool } from "./components/save-preset";
import { RunTool } from "./components/run-tool";
import { ToolBrowser } from "./search-tools";
import { loadSavedTools, removeSavedTool, savedToolsKey } from "./lib/saved-tools";
import { integrationIcon, integrationLabel, useIntegrationDirectory } from "./lib/integrations";
import { titleCase } from "./lib/format";

function SavedTools() {
  const { data, isLoading, error, revalidate } = usePromise(loadSavedTools, [savedToolsKey()]);
  const directory = useIntegrationDirectory();
  return (
    <List
      navigationTitle={workspaceTitle("Saved Tools")}
      isLoading={isLoading}
      searchBarPlaceholder="Search saved tools and input presets"
    >
      <List.EmptyView
        icon={error ? Icon.Warning : Icon.Star}
        title={error ? "Could Not Load Saved Tools" : "No Saved Tools"}
        description={error ? error.message : "Save a tool from its action menu, or save inputs from the review screen."}
        actions={
          <ActionPanel>
            <Action.Push
              title="Find Tools to Save"
              icon={Icon.Plus}
              shortcut={Keyboard.Shortcut.Common.New}
              target={<ToolBrowser />}
            />
            <Action
              shortcut={Keyboard.Shortcut.Common.Refresh}
              title="Reload Saved Tools"
              icon={Icon.ArrowClockwise}
              onAction={() => revalidate()}
            />
            <WorkspaceAction />
          </ActionPanel>
        }
      />
      {(data ?? []).map((item) => (
        <List.Item
          key={item.id}
          id={item.id}
          title={item.title}
          icon={integrationIcon(item.tool.integration, directory)}
          subtitle={`${integrationLabel(item.tool.integration, directory)} · ${titleCase(item.tool.connection)}`}
          accessories={[{ tag: item.args ? "Preset" : "Favorite" }]}
          actions={
            <ActionPanel>
              <Action.Push
                title={item.args ? "Use Preset" : "Run Tool"}
                icon={Icon.Play}
                target={<RunTool tool={item.tool} initialArgs={item.args} />}
              />
              <Action.Push
                title="Edit Saved Tool"
                icon={Icon.Pencil}
                shortcut={Keyboard.Shortcut.Common.Edit}
                target={<EditSavedTool item={item} onSaved={revalidate} />}
              />
              <Action.Push
                title="Find Tools to Save"
                icon={Icon.Plus}
                shortcut={Keyboard.Shortcut.Common.New}
                target={<ToolBrowser />}
              />
              <Action
                title="Remove Saved Tool"
                shortcut={Keyboard.Shortcut.Common.Remove}
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={async () => {
                  try {
                    await removeSavedTool(item.id);
                    await revalidate();
                  } catch (error) {
                    await showFailureToast(error, { title: "Could Not Remove Saved Tool" });
                  }
                }}
              />
              <Action
                shortcut={Keyboard.Shortcut.Common.Refresh}
                title="Reload Saved Tools"
                icon={Icon.ArrowClockwise}
                onAction={() => revalidate()}
              />
              <WorkspaceAction />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default withWorkspace(SavedTools);
