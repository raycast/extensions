import { ActionPanel, Action, List, showToast, Toast, Color, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { execAsync, parseDistros, parseOnlineDistros, Distro, OnlineDistro } from "./utils/wsl";

export default function Command() {
  const [distros, setDistros] = useState<Distro[]>([]);
  const [onlineDistros, setOnlineDistros] = useState<OnlineDistro[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setIsLoading(true);
    await Promise.all([fetchDistros(), fetchOnlineDistros()]);
    setIsLoading(false);
  }

  async function fetchDistros() {
    try {
      const { stdout } = await execAsync("wsl --list --verbose");
      const parsedDistros = parseDistros(stdout);
      setDistros(parsedDistros);
    } catch {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load WSL Distros",
        message: "Unknown error",
      });
    }
  }

  async function fetchOnlineDistros() {
    try {
      const { stdout } = await execAsync("wsl --list --online");
      const parsed = parseOnlineDistros(stdout);
      setOnlineDistros(parsed);
    } catch {
      // Online check might fail if offline, don't block main UI
      setOnlineDistros([]);
    }
  }

  async function openTerminal(name: string) {
    try {
      await execAsync(`start wsl -d ${name}`);
      // No toast needed for terminal as it pops up visually
    } catch {
      await showToast({ style: Toast.Style.Failure, title: "Failed to open terminal" });
    }
  }

  async function startDistro(name: string) {
    try {
      // Start a background process that keeps the distro alive without a window
      await execAsync(`wsl -d ${name} -e sh -c "nohup sleep infinity > /dev/null 2>&1 &"`);
      await showToast({ style: Toast.Style.Success, title: `Started ${name}` });
      // Give it a moment to change state then refresh
      setTimeout(fetchAll, 1000);
    } catch {
      await showToast({ style: Toast.Style.Failure, title: "Failed to start" });
    }
  }

  async function terminateDistro(name: string) {
    try {
      await execAsync(`wsl --terminate ${name}`);
      await showToast({ style: Toast.Style.Success, title: `Terminated ${name}` });
      fetchDistros(); // Refresh status
    } catch {
      await showToast({ style: Toast.Style.Failure, title: `Failed to terminate ${name}` });
    }
  }

  async function installDistro(name: string) {
    try {
      // Installation takes time, so we just trigger it in a new window to show progress
      await execAsync(`start wsl --install -d ${name}`);
      await showToast({
        style: Toast.Style.Success,
        title: `Installing ${name}...`,
        message: "Check the new terminal window",
      });
    } catch {
      await showToast({ style: Toast.Style.Failure, title: `Failed to install ${name}` });
    }
  }

  async function uninstallDistro(name: string) {
    // Basic action, user will need to confirm if we add a confirmation dialog later
    // For now we rely on the user knowing what "Destructive" style means
    try {
      await execAsync(`wsl --unregister ${name}`);
      await showToast({ style: Toast.Style.Success, title: `Uninstalled ${name}` });
      fetchDistros();
    } catch {
      await showToast({ style: Toast.Style.Failure, title: `Failed to uninstall ${name}` });
    }
  }

  // Filter logic
  const filteredDistros = distros.filter((d) => d.name.toLowerCase().includes(searchText.toLowerCase()));

  const filteredOnlineDistros = onlineDistros.filter(
    (d) =>
      d.name.toLowerCase().includes(searchText.toLowerCase()) ||
      d.friendlyName.toLowerCase().includes(searchText.toLowerCase()),
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search distros..." onSearchTextChange={setSearchText}>
      <List.Section title="Installed Distributions">
        {filteredDistros.map((distro) => (
          <List.Item
            key={distro.name}
            title={distro.name}
            subtitle={distro.state}
            accessories={[{ text: `v${distro.version}` }]}
            icon={
              distro.state === "Running"
                ? { source: Icon.CircleFilled, tintColor: Color.Green }
                : { source: Icon.Circle, tintColor: Color.SecondaryText }
            }
            actions={
              <ActionPanel>
                {/* Primary Action: Open Terminal if running, Start if stopped */}
                {distro.state === "Running" ? (
                  <Action title="Open Terminal" icon={Icon.Terminal} onAction={() => openTerminal(distro.name)} />
                ) : (
                  <Action title="Start Distro" icon={Icon.Play} onAction={() => startDistro(distro.name)} />
                )}

                {/* Secondary: Allow opening terminal even if stopped (optional, but good for "Launch" intent) */}
                {distro.state !== "Running" && (
                  <Action
                    title="Open Terminal"
                    icon={Icon.Terminal}
                    shortcut={{ modifiers: ["cmd"], key: "return" }}
                    onAction={() => openTerminal(distro.name)}
                  />
                )}

                {distro.state === "Running" && (
                  <Action
                    title="Terminate Distro"
                    style={Action.Style.Destructive}
                    icon={Icon.Stop}
                    shortcut={{ modifiers: ["ctrl"], key: "t" }}
                    onAction={() => terminateDistro(distro.name)}
                  />
                )}

                <Action
                  title="Uninstall Distro"
                  style={Action.Style.Destructive}
                  icon={Icon.Trash}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={async () => {
                    // Adding a simple confirm alert logic here would be ideal but requires import
                    // sticking to direct action for now
                    await uninstallDistro(distro.name);
                  }}
                />

                <Action title="Refresh List" onAction={fetchAll} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title="Available Online">
        {filteredOnlineDistros.map((distro) => (
          <List.Item
            key={distro.name}
            title={distro.friendlyName}
            subtitle={distro.name}
            icon={Icon.Cloud}
            actions={
              <ActionPanel>
                <Action title="Install Distro" onAction={() => installDistro(distro.name)} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
