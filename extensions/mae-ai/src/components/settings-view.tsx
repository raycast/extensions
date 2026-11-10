import {
  Action,
  ActionPanel,
  Icon,
  getPreferenceValues,
  Keyboard,
  launchCommand,
  LaunchType,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { loadDeletedTools, loadTools, restoreTool } from "../lib/storage";
import { builtInTools, Tool, toolDeeplink } from "../lib/tools";
import ToolEditor, { confirmDeleteCommand } from "./tool-editor";
import AgentSettingsView from "./agent-settings";
import { effectiveAgentSettings, AskBackend } from "../lib/agent-settings";
import { loadAgentSettings } from "../lib/agent-settings-storage";
import { Preferences } from "../lib/preferences";

export default function SettingsView({
  onChange,
}: {
  onChange?: () => void | Promise<void>;
}) {
  const { push } = useNavigation();
  const [tools, setTools] = useState<Tool[]>([]);
  const [deleted, setDeleted] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [backend, setBackend] = useState<AskBackend>("direct");
  const refresh = useCallback(async () => {
    try {
      const [active, removed, saved] = await Promise.all([
        loadTools(),
        loadDeletedTools(),
        loadAgentSettings(),
      ]);
      setTools(active);
      setDeleted(removed);
      setBackend(
        effectiveAgentSettings(getPreferenceValues<Preferences>(), saved)
          .backend,
      );
    } catch (failure) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Cannot Load Commands",
        message: failure instanceof Error ? failure.message : String(failure),
      });
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function changed() {
    await refresh();
    await onChange?.();
  }

  function add() {
    push(<ToolEditor onSave={changed} />);
  }

  function edit(tool: Tool) {
    push(<ToolEditor tool={tool} onSave={changed} onDelete={changed} />);
  }

  return (
    <List
      navigationTitle="Pocket AI Settings"
      isLoading={loading}
      searchBarPlaceholder="Find a command or setting..."
      actions={
        <ActionPanel>
          <Action title="Add New Command" icon={Icon.Plus} onAction={add} />
        </ActionPanel>
      }
    >
      <List.Section title="Settings">
        <List.Item
          id="add-command"
          title="Add New Command"
          subtitle="Start from a template"
          icon={Icon.Plus}
          keywords={["create", "template", "new", "custom"]}
          actions={
            <ActionPanel>
              <Action title="Add New Command" icon={Icon.Plus} onAction={add} />
            </ActionPanel>
          }
        />
        <List.Item
          id="remote-agent-settings"
          title="Remote Agents"
          subtitle={`Ask AI: ${backend === "hermes" ? "Hermes Agent" : backend === "openclaw" ? "OpenClaw Agent" : "Direct Model"}`}
          icon={Icon.Network}
          keywords={[
            "agent",
            "hermes",
            "openclaw",
            "harness",
            "server",
            "backend",
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Configure Remote Agents"
                icon={Icon.Gear}
                target={<AgentSettingsView onSave={changed} />}
              />
            </ActionPanel>
          }
        />
        <List.Item
          id="provider-settings"
          title="AI Provider"
          subtitle="API endpoint and key"
          icon={Icon.Globe}
          keywords={["models", "endpoint", "key", "configure"]}
          actions={
            <ActionPanel>
              <Action
                title="Configure AI Provider"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Commands" subtitle="Select a command to edit">
        {tools.map((tool) => {
          const builtIn = builtInTools.some((item) => item.id === tool.id);
          return (
            <List.Item
              key={tool.id}
              id={tool.id}
              title={tool.title}
              subtitle={builtIn ? "Built-in" : "Custom"}
              icon="pocket-ai-native.png"
              accessories={[{ icon: Icon.Pencil, tooltip: "Edit Command" }]}
              actions={
                <ActionPanel>
                  <Action
                    title="Edit Command"
                    icon={Icon.Pencil}
                    shortcut={Keyboard.Shortcut.Common.Edit}
                    onAction={() => edit(tool)}
                  />
                  <Action
                    title="Add New Command"
                    icon={Icon.Plus}
                    shortcut={Keyboard.Shortcut.Common.New}
                    onAction={add}
                  />
                  <Action
                    title="Delete Command"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    onAction={async () => {
                      if (await confirmDeleteCommand(tool)) await changed();
                    }}
                  />
                  <Action
                    title="Run Command"
                    icon={Icon.Play}
                    onAction={() =>
                      launchCommand({
                        name: builtIn ? tool.id : "custom-tool",
                        type: LaunchType.UserInitiated,
                        arguments: builtIn ? undefined : { tool: tool.id },
                      })
                    }
                  />
                  <Action.CreateQuicklink
                    title="Add Command to Raycast"
                    quicklink={{ name: tool.title, link: toolDeeplink(tool) }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Shortcut Deeplink"
                    content={toolDeeplink(tool)}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
      {deleted.length > 0 && (
        <List.Section
          title="Deleted Built-in Commands"
          subtitle="Restore with previous settings"
        >
          {deleted.map((tool) => (
            <List.Item
              key={tool.id}
              id={`deleted-${tool.id}`}
              title={tool.title}
              subtitle="Deleted"
              icon={Icon.Trash}
              actions={
                <ActionPanel>
                  <Action
                    title="Restore Command"
                    icon={Icon.ArrowCounterClockwise}
                    onAction={async () => {
                      try {
                        await restoreTool(tool.id);
                        await changed();
                        await showToast({
                          style: Toast.Style.Success,
                          title: "Command Restored",
                        });
                      } catch (failure) {
                        await showToast({
                          style: Toast.Style.Failure,
                          title: "Cannot Restore Command",
                          message: String(failure),
                        });
                      }
                    }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
