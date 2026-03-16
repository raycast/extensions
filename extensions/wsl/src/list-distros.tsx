import { useEffect, useState } from "react";
import { Action, ActionPanel, Color, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import { listDistros, isWslInstalled, setDefaultDistro, WslDistro } from "./lib/wsl";
import { isWindowsTerminalInstalled, openInWindowsTerminal } from "./lib/terminal";
import { WslNotInstalled } from "./components/wsl-not-installed";

export default function Command() {
  const [distros, setDistros] = useState<WslDistro[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [wslAvailable, setWslAvailable] = useState<boolean | null>(null);
  const hasWT = isWindowsTerminalInstalled();

  const loadDistros = async () => {
    setIsLoading(true);
    try {
      const available = await isWslInstalled();
      setWslAvailable(available);
      if (!available) {
        setIsLoading(false);
        return;
      }
      const list = await listDistros();
      setDistros(list);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load distros",
        message: String(error),
      });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadDistros();
  }, []);

  if (wslAvailable === false) {
    return <WslNotInstalled />;
  }

  const handleSetDefault = async (name: string) => {
    // Changing the system-wide WSL default affects every tool that relies on
    // `wsl.exe` without a -d flag. Confirm so the user understands the scope.
    const confirmed = await confirmAlert({
      title: `Set ${name} as Default Distro?`,
      message: `This will change your system-wide WSL default. Any tool or script that calls wsl.exe without specifying a distro will use ${name} from now on.`,
      primaryAction: { title: "Set as Default" },
    });
    if (!confirmed) return;

    try {
      await setDefaultDistro(name);
      showToast({ style: Toast.Style.Success, title: `${name} is now the default distro` });
      await loadDistros();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to set default",
        message: String(error),
      });
    }
  };

  return (
    <List isLoading={isLoading} navigationTitle="WSL Distributions" searchBarPlaceholder="Filter distributions…">
      {distros.length === 0 && !isLoading && (
        <List.EmptyView
          title="No Distributions Found"
          description="Install a distribution from the Microsoft Store or run `wsl --install` in PowerShell as Administrator."
          icon={{ source: Icon.Desktop, tintColor: Color.Orange }}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open Wsl Documentation"
                url="https://learn.microsoft.com/en-us/windows/wsl/install"
              />
            </ActionPanel>
          }
        />
      )}
      {distros.map((distro) => (
        <List.Item
          key={distro.name}
          icon={
            distro.running
              ? { source: Icon.CircleFilled, tintColor: Color.Green }
              : { source: Icon.Circle, tintColor: Color.SecondaryText }
          }
          title={distro.name}
          accessories={[
            // Star icon signals the default distro without consuming subtitle space,
            // leaving subtitle free for future use (e.g. distro version/kernel).
            ...(distro.isDefault
              ? [{ icon: { source: Icon.Star, tintColor: Color.Yellow }, tooltip: "Default distro" }]
              : []),
            {
              tag: {
                value: distro.running ? "Running" : "Stopped",
                color: distro.running ? Color.Green : Color.SecondaryText,
              },
            },
            // Version as a plain text accessory keeps it readable without adding
            // another colored tag that would compete with Running/Stopped.
            { text: `WSL ${distro.version}`, tooltip: `WSL version ${distro.version}` },
          ]}
          actions={
            <ActionPanel>
              <ActionPanel.Section title="Terminal">
                {hasWT ? (
                  <Action
                    title="Open in Windows Terminal"
                    icon={Icon.Window}
                    onAction={() => openInWindowsTerminal(distro.name)}
                  />
                ) : (
                  // When Windows Terminal is absent the section would be empty,
                  // leaving the user with no primary action. Fall back to a
                  // helpful copy action so Enter always does something useful.
                  <Action.CopyToClipboard title="Copy Distro Name" content={distro.name} icon={Icon.Clipboard} />
                )}
              </ActionPanel.Section>
              <ActionPanel.Section title="Manage">
                {!distro.isDefault && (
                  <Action
                    title="Set as Default Distro"
                    icon={Icon.Star}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                    onAction={() => handleSetDefault(distro.name)}
                  />
                )}
                {/* Only show CopyToClipboard here when WT is present; otherwise it
                    already appears as the primary action above. */}
                {hasWT && (
                  <Action.CopyToClipboard
                    title="Copy Distro Name"
                    content={distro.name}
                    icon={Icon.Clipboard}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                )}
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={loadDistros}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
