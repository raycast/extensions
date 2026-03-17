import {
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  useNavigation,
  Form,
  getPreferenceValues,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { parseSSHConfig, SSHHostConfig, saveSSHConfig } from "./utils/parser";

export default function Command() {
  const { push } = useNavigation();
  const preferences = getPreferenceValues<Preferences.SshConfig>();
  const [configs, setConfigs] = useState<SSHHostConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  function escapeAppleScriptString(value: string) {
    return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  }

  function shellQuote(value: string) {
    return `'${value.replace(/'/g, `'"'"'`)}'`;
  }

  function buildSshCommand(config: SSHHostConfig) {
    const host = config.host?.trim() || "";
    const hostName = config.hostName?.trim() || "";
    const user = config.user?.trim() || "";
    const port = config.port?.trim() || "";
    const identityFile = config.identityFile?.trim() || "";

    const hasAlias = Boolean(hostName && host && host !== hostName);
    if (hasAlias) {
      return `ssh ${shellQuote(host)}`;
    }

    const destinationHost = hostName || host;
    const destination = user ? `${user}@${destinationHost}` : destinationHost;

    if (!destinationHost) {
      throw new Error("Missing host/hostname in SSH config entry");
    }

    const parts = ["ssh"];
    if (identityFile) {
      parts.push("-i", shellQuote(identityFile));
    }
    if (port) {
      parts.push("-p", shellQuote(port));
    }
    parts.push(shellQuote(destination));
    return parts.join(" ");
  }

  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    setIsLoading(true);
    try {
      const data = await parseSSHConfig();
      setConfigs(data);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load config",
        message: (error as Error).message,
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(host: string) {
    const shouldDelete = await confirmAlert({
      title: "Delete SSH Entry",
      message: `Are you sure you want to delete '${host}' from SSH config? This cannot be undone.`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!shouldDelete) {
      return;
    }

    const updated = configs.filter((c) => c.host !== host);
    try {
      await saveSSHConfig(updated);
      showToast({
        style: Toast.Style.Success,
        title: "Host deleted",
        message: host,
      });
      loadConfig();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete",
        message: (error as Error).message,
      });
    }
  }

  async function handleConnect(config: SSHHostConfig) {
    try {
      const sshCommand = buildSshCommand(config);
      const escapedCommand = escapeAppleScriptString(sshCommand);
      const { execFile } = await import("child_process");
      const { promisify } = await import("util");
      const execFileAsync = promisify(execFile);

      const terminalApp = preferences.terminalApp || "terminal";

      if (terminalApp === "terminal") {
        await execFileAsync("osascript", [
          "-e",
          `tell application "Terminal" to do script "${escapedCommand}"`,
          "-e",
          'tell application "Terminal" to activate',
        ]);
        return;
      }

      if (terminalApp === "iterm2") {
        await execFileAsync("osascript", [
          "-e",
          `tell application "iTerm" to create window with default profile command "${escapedCommand}"`,
          "-e",
          'tell application "iTerm" to activate',
        ]);
        return;
      }

      if (terminalApp === "alacritty") {
        await execFileAsync("open", ["-a", "Alacritty", "--args", "-e", "zsh", "-lc", sshCommand]);
        return;
      }

      if (terminalApp === "wezterm") {
        await execFileAsync("open", ["-a", "WezTerm", "--args", "start", "--", "zsh", "-lc", sshCommand]);
        return;
      }

      if (terminalApp === "kitty") {
        await execFileAsync("open", ["-a", "kitty", "--args", "zsh", "-lc", sshCommand]);
        return;
      }

      const customTemplate = preferences.customTerminalCommand?.trim();
      if (!customTemplate) {
        throw new Error("Set Custom Terminal Command in command preferences");
      }

      const customCommand = customTemplate.includes("{{command}}")
        ? customTemplate.replace(/\{\{command\}\}/g, sshCommand)
        : `${customTemplate} ${sshCommand}`;

      await execFileAsync("zsh", ["-lc", customCommand]);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to connect",
        message: (error as Error).message,
      });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search hosts...">
      {configs.map((config: SSHHostConfig) => (
        <List.Item
          key={config.host}
          title={config.host}
          subtitle={`${config.user || "root"}@${config.hostName || "N/A"} Port: ${config.port || "22"} ${config.identityFile ? `SSH Key: ${config.identityFile}` : ""}`}
          icon={Icon.Terminal}
          actions={
            <ActionPanel>
              <Action
                title="Connect"
                icon={Icon.Terminal}
                shortcut={{ modifiers: ["cmd"], key: "enter" }}
                onAction={() => handleConnect(config)}
              />
              <Action
                title="Edit Entry"
                icon={Icon.Pencil}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
                onAction={() => push(<HostForm config={config} onSave={loadConfig} />)}
              />
              <Action
                title="Open Config in Editor"
                icon={Icon.Document}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
                onAction={async () => {
                  try {
                    const { execFile } = await import("child_process");
                    const { promisify } = await import("util");
                    const execFileAsync = promisify(execFile);
                    const path = await import("path");
                    const os = await import("os");

                    await execFileAsync("open", ["-e", path.join(os.homedir(), ".ssh", "config")]);
                  } catch (error) {
                    showToast({
                      style: Toast.Style.Failure,
                      title: "Failed to open config",
                      message: String(error),
                    });
                  }
                }}
              />
              <Action
                title="New Host Entry"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                onAction={() => push(<HostForm onSave={loadConfig} />)}
              />
              <ActionPanel.Section title="Danger Zone">
                <Action
                  title="Delete Entry"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{
                    modifiers: ["ctrl"],
                    key: "x",
                  }}
                  onAction={() => handleDelete(config.host)}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function HostForm(props: { config?: SSHHostConfig; onSave: () => void }) {
  const { pop } = useNavigation();

  async function handleSubmit(values: {
    host: string;
    hostName: string;
    user: string;
    identityFile: string;
    port: string;
  }) {
    try {
      const currentConfigs = await parseSSHConfig();

      const newConfig: SSHHostConfig = {
        host: values.host,
        hostName: values.hostName,
        user: values.user,
        identityFile: values.identityFile,
        port: values.port,
        rawBlock: "", // Will be generated by saveSSHConfig if empty
      };

      let updatedConfigs: SSHHostConfig[] = [];
      if (props.config) {
        // Edit
        updatedConfigs = currentConfigs.map((c) => (c.host === props.config!.host ? newConfig : c));
      } else {
        // New
        updatedConfigs = [...currentConfigs, newConfig];
      }

      await saveSSHConfig(updatedConfigs);
      showToast({ style: Toast.Style.Success, title: "Config saved" });
      props.onSave();
      pop();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to save",
        message: (error as Error).message,
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Config" onSubmit={handleSubmit} shortcut={{ modifiers: ["cmd"], key: "s" }} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="host"
        title="Host Alias"
        defaultValue={props.config?.host || ""}
        placeholder="e.g. myserver"
      />
      <Form.TextField
        id="hostName"
        title="HostName"
        defaultValue={props.config?.hostName || ""}
        placeholder="e.g. 192.168.1.1 or github.com"
      />
      <Form.TextField id="user" title="User" defaultValue={props.config?.user || ""} placeholder="e.g. root" />
      <Form.TextField
        id="identityFile"
        title="IdentityFile"
        defaultValue={props.config?.identityFile || ""}
        placeholder="e.g. ~/.ssh/id_ed25519"
      />
      <Form.TextField id="port" title="Port" defaultValue={props.config?.port || ""} placeholder="e.g. 22" />
    </Form>
  );
}
