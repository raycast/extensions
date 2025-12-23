import { Action, ActionPanel, Color, Form, Icon, List, Toast, showToast, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import {
  MiseInstalledTool,
  MiseToolVersion,
  formatMiseError,
  setToolVersion,
  uninstallToolVersion,
  unuseTool,
} from "../tools/mise";

export function ToolSection({ tool, onRefresh }: { tool: MiseInstalledTool; onRefresh: () => void }) {
  // Simple semantic version compare helper
  const latestVersion = [...tool.versions].sort((a, b) => {
    return b.version.localeCompare(a.version, undefined, { numeric: true });
  })[0];

  return (
    <List.Section
      title={tool.name}
      subtitle={`${tool.versions.length} version${tool.versions.length === 1 ? "" : "s"}`}
    >
      {tool.versions.map((version) => (
        <ToolVersionItem
          key={`${tool.name}-${version.version}`}
          toolName={tool.name}
          version={version}
          latestInstalledVersion={latestVersion?.version}
          onRefresh={onRefresh}
        />
      ))}
    </List.Section>
  );
}

function ToolVersionItem({
  toolName,
  version,
  latestInstalledVersion,
  onRefresh,
}: {
  toolName: string;
  version: MiseToolVersion;
  latestInstalledVersion?: string;
  onRefresh: () => void;
}) {
  const accessories = [
    version.isActive
      ? {
          icon: { source: Icon.CheckCircle, tintColor: Color.Green },
          tooltip: "Active in current environment",
        }
      : undefined,
    version.requestedVersion && version.requestedVersion !== version.version
      ? { tag: `Requested ${version.requestedVersion}` }
      : version.requestedVersion
        ? { tag: "Pinned" }
        : undefined,
  ].filter(Boolean) as List.Item.Accessory[];

  const isGlobalConfig =
    version.sourcePath?.includes("config.toml") || version.sourcePath?.includes("mise/config.toml");
  const configType = isGlobalConfig ? "Global" : "Local";

  return (
    <List.Item
      title={version.version.length > 0 ? version.version : "Unknown version"}
      subtitle={version.installPath}
      keywords={[toolName, version.version]}
      icon={{ source: Icon.Box, tintColor: Color.PrimaryText }}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Management">
            <Action
              title="Set as Global"
              icon={Icon.Globe}
              onAction={async () => {
                const toast = await showToast({
                  style: Toast.Style.Animated,
                  title: `Setting global ${toolName}@${version.version}`,
                });
                try {
                  await setToolVersion(toolName, version.version, { global: true });
                  toast.style = Toast.Style.Success;
                  toast.title = `Global set to ${toolName}@${version.version}`;
                  onRefresh();
                } catch (error) {
                  toast.style = Toast.Style.Failure;
                  toast.title = "Failed to set global version";
                  toast.message = formatMiseError(error);
                }
              }}
            />
            {latestInstalledVersion && latestInstalledVersion !== version.version && (
              <Action
                title={`Set Latest (${latestInstalledVersion}) as Global`}
                icon={Icon.Globe}
                shortcut={{ modifiers: ["opt"], key: "g" }}
                onAction={async () => {
                  const toast = await showToast({
                    style: Toast.Style.Animated,
                    title: `Setting global ${toolName}@${latestInstalledVersion}`,
                  });
                  try {
                    await setToolVersion(toolName, latestInstalledVersion, { global: true });
                    toast.style = Toast.Style.Success;
                    toast.title = `Global set to ${toolName}@${latestInstalledVersion}`;
                    onRefresh();
                  } catch (error) {
                    toast.style = Toast.Style.Failure;
                    toast.title = "Failed to set global version";
                    toast.message = formatMiseError(error);
                  }
                }}
              />
            )}
            <Action.Push
              title="Pin to Project…"
              icon={Icon.Folder}
              target={<PinToProjectForm toolName={toolName} version={version.version} />}
            />
            {version.sourcePath ? (
              <Action
                title={`Remove from ${configType} Config`}
                icon={Icon.XMarkCircle}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                onAction={async () => {
                  const toast = await showToast({
                    style: Toast.Style.Animated,
                    title: `Removing ${toolName} from ${configType.toLowerCase()} config`,
                  });
                  try {
                    await unuseTool(toolName, { path: version.sourcePath });
                    toast.style = Toast.Style.Success;
                    toast.title = `Removed ${toolName}`;
                    toast.message = `From ${version.sourcePath}`;
                    onRefresh();
                  } catch (error) {
                    toast.style = Toast.Style.Failure;
                    toast.title = "Failed to remove from config";
                    toast.message = formatMiseError(error);
                  }
                }}
              />
            ) : null}
          </ActionPanel.Section>
          <ActionPanel.Section title="Actions">
            <Action.CopyToClipboard title="Copy Version" content={version.version} />
            {version.installPath ? (
              <Action.CopyToClipboard title="Copy Install Path" content={version.installPath} />
            ) : null}
            {version.installPath ? <Action.Open title="Open Install Directory" target={version.installPath} /> : null}
            {version.sourcePath ? <Action.Open title="Open Source Config" target={version.sourcePath} /> : null}
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={() => {
                onRefresh();
              }}
            />
            <Action
              title="Uninstall Version"
              style={Action.Style.Destructive}
              icon={Icon.Trash}
              onAction={async () => {
                const toast = await showToast({
                  style: Toast.Style.Animated,
                  title: `Uninstalling ${toolName}@${version.version}`,
                });
                try {
                  await uninstallToolVersion(toolName, version.version);
                  toast.style = Toast.Style.Success;
                  toast.title = `Uninstalled ${toolName}@${version.version}`;
                  onRefresh();
                } catch (error) {
                  toast.style = Toast.Style.Failure;
                  toast.title = `Failed to uninstall ${toolName}@${version.version}`;
                  toast.message = formatMiseError(error);
                }
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Tool" text={toolName} icon={Icon.Box} />
              <List.Item.Detail.Metadata.Label title="Version" text={version.version || "Unknown"} icon={Icon.Tag} />

              <List.Item.Detail.Metadata.Separator />

              <List.Item.Detail.Metadata.Label
                title="Status"
                text={version.isActive ? "Active" : "Inactive"}
                icon={
                  version.isActive
                    ? { source: Icon.CheckCircle, tintColor: Color.Green }
                    : { source: Icon.Circle, tintColor: Color.SecondaryText }
                }
              />
              <List.Item.Detail.Metadata.Label
                title="Installed"
                text={version.isInstalled ? "Yes" : "No"}
                icon={
                  version.isInstalled
                    ? { source: Icon.Check, tintColor: Color.Green }
                    : { source: Icon.Multiply, tintColor: Color.Red }
                }
              />

              <List.Item.Detail.Metadata.Separator />

              {version.requestedVersion ? (
                <List.Item.Detail.Metadata.Label title="Requested" text={version.requestedVersion} />
              ) : null}
              {version.installPath ? (
                <List.Item.Detail.Metadata.Label title="Install Path" text={version.installPath} />
              ) : null}
              {version.sourcePath ? (
                <List.Item.Detail.Metadata.Label title="Defined In" text={version.sourcePath} />
              ) : null}
            </List.Item.Detail.Metadata>
          }
        />
      }
    />
  );
}

function PinToProjectForm({ toolName, version }: { toolName: string; version: string }) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<{ path: string[] }>({
    onSubmit: async (values) => {
      if (!values.path || values.path.length === 0) {
        await showToast({ style: Toast.Style.Failure, title: "No directory selected" });
        return;
      }
      const targetPath = values.path[0];

      const toast = await showToast({ style: Toast.Style.Animated, title: `Pinning ${toolName} to ${targetPath}` });
      try {
        await setToolVersion(toolName, version, { path: targetPath });
        toast.style = Toast.Style.Success;
        toast.title = `Pinned ${toolName}@${version}`;
        toast.message = `In ${targetPath}`;
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to pin version";
        toast.message = formatMiseError(error);
      }
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Pin Version" onSubmit={handleSubmit} icon={Icon.Pin} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Pin ${toolName}@${version} to a specific project directory.`} />
      <Form.FilePicker
        {...itemProps.path}
        title="Project Directory"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
      />
    </Form>
  );
}
