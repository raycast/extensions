import {
  ActionPanel,
  List,
  Action,
  Icon,
  Color,
  showToast,
  Toast,
  Form,
  useNavigation,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { exec } from "child_process";
import { promisify } from "util";
import { getPresets, getCustomTools, saveCustomTool, removeCustomTool, getVersion, DevTool } from "./utils/tools";

const execAsync = promisify(exec);

export default function Command() {
  const [tools, setTools] = useState<DevTool[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    refreshTools();
  }, []);

  async function refreshTools() {
    setIsLoading(true);
    const presets = await getPresets();
    const custom = await getCustomTools();
    const all = [...presets, ...custom];

    // Parallel version fetching
    await Promise.all(
      all.map(async (t) => {
        t.detectedVersion = await getVersion(t.versionCmd);
      }),
    );

    setTools(all);
    setIsLoading(false);
  }

  async function runUpdate(tool: DevTool) {
    if (!tool.updateCmd) {
      showToast({ style: Toast.Style.Failure, title: "No update command defined" });
      return;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: `Updating ${tool.name}...` });
    try {
      if (tool.name === "PHP" && tool.manager === "chocolatey") {
        // Choco often asks for confirmation, so we add -y in the command generation logic,
        // but strictly speaking exec might fail if elevated rights are needed.
        // On Windows, Raycast usually runs as user.
      }

      await execAsync(tool.updateCmd);
      toast.style = Toast.Style.Success;
      toast.title = "Update Completed";
      await refreshTools();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Update Failed";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  async function runBatchUpdate() {
    if (
      await confirmAlert({
        title: "Update All Tools",
        message: "This will attempt to update all listed tools sequentially. Continue?",
      })
    ) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Starting Batch Update..." });

      for (const tool of tools) {
        if (tool.updateCmd) {
          toast.message = `Updating ${tool.name}...`;
          try {
            await execAsync(tool.updateCmd);
          } catch (e) {
            console.error(`Failed to update ${tool.name}`, e);
          }
        }
      }

      toast.style = Toast.Style.Success;
      toast.title = "Batch Update Finished";
      await refreshTools();
    }
  }

  async function handleDelete(id: string) {
    if (
      await confirmAlert({
        title: "Remove Tool",
        message: "Remove this custom tool from the list?",
        primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
      })
    ) {
      await removeCustomTool(id);
      await refreshTools();
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Manage development tools..."
      actions={
        <ActionPanel>
          <Action title="Refresh Versions" icon={Icon.ArrowClockwise} onAction={refreshTools} />
          <Action title="Update All Tools" icon={Icon.RotateAntiClockwise} onAction={runBatchUpdate} />
          <Action.Push title="Add Custom Tool" icon={Icon.Plus} target={<EditToolForm onSuccess={refreshTools} />} />
        </ActionPanel>
      }
    >
      {tools.map((tool) => (
        <List.Item
          key={tool.id}
          icon={
            tool.detectedVersion === "Not Installed" ? { source: Icon.Warning, tintColor: Color.Red } : Icon.CheckCircle
          }
          title={tool.name}
          subtitle={tool.detectedVersion}
          accessories={[{ text: tool.manager.toUpperCase() }, { icon: tool.isCustom ? Icon.Person : Icon.Terminal }]}
          actions={
            <ActionPanel>
              <ActionPanel.Section title="Management">
                <Action title="Update Tool" icon={Icon.Download} onAction={() => runUpdate(tool)} />
                <Action.Push
                  title="Install Specific Version / Clean Install"
                  icon={Icon.Gear}
                  target={<VersionManagerForm tool={tool} onSuccess={refreshTools} />}
                />
              </ActionPanel.Section>
              <ActionPanel.Section title="Configuration">
                {tool.isCustom && (
                  <Action.Push
                    title="Edit Tool"
                    icon={Icon.Pencil}
                    target={<EditToolForm tool={tool} onSuccess={refreshTools} />}
                  />
                )}
                {tool.isCustom && (
                  <Action
                    title="Remove Tool"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => handleDelete(tool.id)}
                  />
                )}
              </ActionPanel.Section>
              <ActionPanel.Section title="Global">
                <Action
                  title="Refresh Versions"
                  icon={Icon.ArrowClockwise}
                  onAction={refreshTools}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function VersionManagerForm({ tool, onSuccess }: { tool: DevTool; onSuccess: () => void }) {
  const { pop } = useNavigation();
  const [cleanInstall, setCleanInstall] = useState(false);
  const [uninstallCommand, setUninstallCommand] = useState(tool.uninstallCmd || "");

  useEffect(() => {
    setUninstallCommand(tool.uninstallCmd || "");
  }, [tool]);

  async function handleSubmit(values: { version: string }) {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Processing..." });

    try {
      // 1. Clean Install (Uninstall first)
      if (cleanInstall) {
        if (!uninstallCommand) {
          throw new Error("No uninstall command defined for this tool.");
        }
        toast.message = `Running: ${uninstallCommand}`;
        await execAsync(uninstallCommand);
      }

      // 2. Install Version
      if (!tool.installVersionCmd) {
        throw new Error("No version installation command available.");
      }

      const cmd = tool.installVersionCmd.replace("{version}", values.version);
      toast.message = `Installing version ${values.version}...`;
      await execAsync(cmd);

      toast.style = Toast.Style.Success;
      toast.title = "Operation Successful";
      onSuccess();
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={cleanInstall ? "Clean Install" : "Install Version"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Manager" text={`${tool.manager.toUpperCase()} - ${tool.detectedVersion || "Unknown"}`} />

      <Form.TextField id="version" title="Target Version" placeholder="e.g., 8.2, 18.0.0, latest" />

      <Form.Checkbox
        id="clean"
        label="Clean Install (Uninstall previous version first)"
        value={cleanInstall}
        onChange={setCleanInstall}
      />

      {cleanInstall && (
        <Form.TextArea
          id="uninstallCmd"
          title="Uninstall Command"
          value={uninstallCommand}
          onChange={setUninstallCommand}
          info="You can edit this command to ensure a deep clean (e.g., add --force)"
        />
      )}

      <Form.Description text="Warning: Clean install will completely remove the tool before installing the new version." />
    </Form>
  );
}

function EditToolForm({ tool, onSuccess }: { tool?: DevTool; onSuccess: () => void }) {
  const { pop } = useNavigation();

  async function handleSubmit(values: {
    name: string;
    versionCmd: string;
    updateCmd: string;
    installVersionCmd: string;
    uninstallCmd: string;
  }) {
    const newTool: DevTool = {
      id: tool?.id || crypto.randomUUID(),
      name: values.name,
      manager: "manual", // Custom tools are always manual/custom manager
      versionCmd: values.versionCmd,
      updateCmd: values.updateCmd,
      installVersionCmd: values.installVersionCmd,
      uninstallCmd: values.uninstallCmd,
      isCustom: true,
    };

    await saveCustomTool(newTool);
    showToast({ style: Toast.Style.Success, title: "Tool Saved" });
    onSuccess();
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Tool" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Tool Name" placeholder="e.g. Python" defaultValue={tool?.name} />
      <Form.TextField
        id="versionCmd"
        title="Check Version Command"
        placeholder="python --version"
        defaultValue={tool?.versionCmd}
      />
      <Form.TextField
        id="updateCmd"
        title="Update Command"
        placeholder="choco upgrade python -y"
        defaultValue={tool?.updateCmd}
      />

      <Form.Separator />

      <Form.TextField
        id="installVersionCmd"
        title="Install Version Command"
        placeholder="choco install python --version={version}"
        info="Use {version} placeholder"
        defaultValue={tool?.installVersionCmd}
      />

      <Form.TextField
        id="uninstallCmd"
        title="Uninstall Command"
        placeholder="choco uninstall python -y"
        defaultValue={tool?.uninstallCmd}
      />
    </Form>
  );
}
