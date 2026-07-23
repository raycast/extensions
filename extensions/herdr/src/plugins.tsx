import { Action, ActionPanel, Alert, Color, Form, Icon, List, confirmAlert, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { runHerdr, runHerdrJson } from "./lib/herdr";
import { runAction, shortcuts } from "./lib/ui";

interface PluginActionInfo {
  plugin_id: string;
  action_id: string;
  title: string;
  description?: string;
  command: string[];
  contexts?: string[];
}

interface PluginInfo {
  plugin_id: string;
  name: string;
  version: string;
  description?: string;
  manifest_path: string;
  plugin_root: string;
  enabled: boolean;
  warnings?: string[];
}

async function getPlugins() {
  const [plugins, actions] = await Promise.all([
    runHerdrJson<{ plugins: PluginInfo[] }>(["plugin", "list", "--json"]),
    runHerdrJson<{ actions: PluginActionInfo[] }>(["plugin", "action", "list"]),
  ]);
  return { plugins: plugins.plugins || [], actions: actions.actions || [] };
}

function InstallPluginForm({ onDone }: { onDone: () => void | Promise<void> }) {
  const [source, setSource] = useState("");
  const [ref, setRef] = useState("");
  const [error, setError] = useState<string>();
  const { pop } = useNavigation();

  async function submit() {
    const value = source.trim();
    if (!/^[^/\s]+\/[^/\s]+(?:\/[^\s]+)*$/.test(value)) {
      setError("Use GitHub shorthand such as owner/repo or owner/repo/subdirectory.");
      return;
    }
    if (
      !(await confirmAlert({
        title: `Install plugin from ${value}?`,
        message:
          "Herdr will download this repository and may run the build commands declared by its manifest. Only install code you trust.",
        primaryAction: { title: "Install Plugin" },
      }))
    )
      return;
    const success = await runAction(
      "Installing plugin",
      async () => {
        const args = ["plugin", "install", value];
        if (ref.trim()) args.push("--ref", ref.trim());
        args.push("--yes");
        await runHerdr(args, { timeout: 300_000 });
      },
      { success: "Plugin Installed", onSuccess: onDone },
    );
    if (success) pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Install Plugin" icon={Icon.Download} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="source"
        title="GitHub Repository"
        placeholder="owner/repo or owner/repo/subdirectory"
        value={source}
        onChange={(value) => {
          setSource(value);
          setError(undefined);
        }}
        error={error}
        autoFocus
      />
      <Form.TextField id="ref" title="Git Ref" placeholder="Default branch" value={ref} onChange={setRef} />
      <Form.Description text="The trust preview is summarized in the confirmation. Herdr installs with its noninteractive --yes mode after you confirm." />
    </Form>
  );
}

export default function Command() {
  const data = useCachedPromise(getPlugins, [], { keepPreviousData: true });

  async function uninstall(plugin: PluginInfo) {
    if (
      !(await confirmAlert({
        title: `Uninstall “${plugin.name}”?`,
        message:
          "The plugin is unregistered. Herdr-managed checkout files are also removed; locally linked source files are left intact.",
        primaryAction: { title: "Uninstall Plugin", style: Alert.ActionStyle.Destructive },
      }))
    )
      return;
    await runAction(
      "Uninstalling plugin",
      () => runHerdr(["plugin", "uninstall", plugin.plugin_id]).then(() => undefined),
      {
        success: "Plugin Uninstalled",
        onSuccess: data.revalidate,
      },
    );
  }

  return (
    <List isLoading={data.isLoading} searchBarPlaceholder="Search plugins and workflow actions…">
      <List.EmptyView
        icon={Icon.Plug}
        title="No Herdr Plugins"
        description="Install a plugin from GitHub to add workflow actions and panes."
      />
      {(data.data?.actions || []).length > 0 ? (
        <List.Section title="Actions" subtitle={`${data.data?.actions.length || 0}`}>
          {(data.data?.actions || []).map((action) => (
            <List.Item
              key={`${action.plugin_id}.${action.action_id}`}
              icon={Icon.Bolt}
              title={action.title}
              subtitle={action.description || action.plugin_id}
              accessories={(action.contexts || []).map((context) => ({ tag: context }))}
              actions={
                <ActionPanel>
                  <Action
                    title="Invoke Plugin Action"
                    icon={Icon.Play}
                    onAction={() =>
                      runAction(
                        "Invoking plugin action",
                        () =>
                          runHerdr(["plugin", "action", "invoke", `${action.plugin_id}.${action.action_id}`]).then(
                            () => undefined,
                          ),
                        {
                          success: `${action.title} Started`,
                          onSuccess: data.revalidate,
                        },
                      )
                    }
                  />
                  <Action.CopyToClipboard
                    title="Copy Qualified Action ID"
                    content={`${action.plugin_id}.${action.action_id}`}
                    shortcut={shortcuts.copyId}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={shortcuts.refresh}
                    onAction={data.revalidate}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : null}
      <List.Section title="Installed Plugins" subtitle={`${data.data?.plugins.length || 0}`}>
        {(data.data?.plugins || []).map((plugin) => (
          <List.Item
            key={plugin.plugin_id}
            icon={{ source: Icon.Plug, tintColor: plugin.enabled ? Color.Green : Color.SecondaryText }}
            title={plugin.name}
            subtitle={plugin.description || plugin.plugin_id}
            accessories={[
              ...(plugin.warnings?.length
                ? [
                    {
                      tag: {
                        value: `${plugin.warnings.length} warning${plugin.warnings.length === 1 ? "" : "s"}`,
                        color: Color.Orange,
                      },
                    },
                  ]
                : []),
              { tag: plugin.enabled ? "Enabled" : "Disabled" },
              { text: `v${plugin.version}` },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title={plugin.enabled ? "Disable Plugin" : "Enable Plugin"}
                  icon={plugin.enabled ? Icon.Pause : Icon.Play}
                  onAction={() =>
                    runAction(
                      `${plugin.enabled ? "Disabling" : "Enabling"} plugin`,
                      () =>
                        runHerdr(["plugin", plugin.enabled ? "disable" : "enable", plugin.plugin_id]).then(
                          () => undefined,
                        ),
                      {
                        success: `Plugin ${plugin.enabled ? "Disabled" : "Enabled"}`,
                        onSuccess: data.revalidate,
                      },
                    )
                  }
                />
                <Action.Push
                  title="Install Another Plugin"
                  icon={Icon.Download}
                  target={<InstallPluginForm onDone={data.revalidate} />}
                />
                <Action.ShowInFinder path={plugin.plugin_root} shortcut={shortcuts.copyPath} />
                <Action.CopyToClipboard title="Copy Plugin ID" content={plugin.plugin_id} shortcut={shortcuts.copyId} />
                <Action
                  title="Uninstall Plugin"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={shortcuts.delete}
                  onAction={() => uninstall(plugin)}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={shortcuts.refresh}
                  onAction={data.revalidate}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      {!data.isLoading ? (
        <List.Section title={(data.data?.plugins.length || 0) > 0 ? "Add" : "Get Started"}>
          <List.Item
            icon={Icon.Download}
            title={(data.data?.plugins.length || 0) > 0 ? "Install Plugin from GitHub" : "Install Your First Plugin"}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Install Plugin"
                  icon={Icon.Download}
                  target={<InstallPluginForm onDone={data.revalidate} />}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}
    </List>
  );
}
