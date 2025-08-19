import {
  ActionPanel,
  Action,
  Icon,
  List,
  showToast,
  Toast,
  Color,
  Form,
  useNavigation,
  LocalStorage,
} from "@raycast/api";
import { useState, useEffect } from "react";

type ToolId = "claude" | "gemini" | "qwen";
type PackageManagerId = "npm" | "pnpm" | "yarn";
type TerminalId = "terminal" | "iterm" | "custom";

interface Settings {
  defaultVibeAgent: ToolId;
  packageManager: PackageManagerId;
  yoloEnabled: boolean;
  defaultTerminal: TerminalId;
  customTerminal?: string;
}

const DEFAULT_SETTINGS: Settings = {
  defaultVibeAgent: "claude",
  packageManager: "npm",
  yoloEnabled: false,
  defaultTerminal: "terminal",
};

const AGENT_OPTIONS = [
  { id: "claude" as ToolId, title: "Claude Code", description: "Anthropic's AI coding assistant" },
  { id: "gemini" as ToolId, title: "Gemini CLI", description: "Google's AI coding assistant" },
  { id: "qwen" as ToolId, title: "Qwen Code CLI", description: "Alibaba's AI coding assistant" },
];

const PACKAGE_MANAGER_OPTIONS = [
  { id: "npm" as PackageManagerId, title: "npm", description: "Node Package Manager" },
  { id: "pnpm" as PackageManagerId, title: "pnpm", description: "Fast, disk space efficient package manager" },
  { id: "yarn" as PackageManagerId, title: "Yarn", description: "Fast, reliable, and secure dependency management" },
];

const TERMINAL_OPTIONS = [
  { id: "terminal" as TerminalId, title: "Terminal", description: "macOS default terminal application" },
  { id: "iterm" as TerminalId, title: "iTerm", description: "iTerm2 - advanced terminal emulator" },
  { id: "custom" as TerminalId, title: "Custom", description: "Specify a custom terminal application" },
];

async function loadSettings(): Promise<Settings> {
  try {
    const storedSettings = await LocalStorage.getItem<string>("easy-vibe-settings");
    if (storedSettings) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(storedSettings) };
    }
  } catch (error) {
    console.error("Error loading settings:", error);
  }
  return DEFAULT_SETTINGS;
}

async function saveSettings(settings: Settings): Promise<void> {
  try {
    await LocalStorage.setItem("easy-vibe-settings", JSON.stringify(settings));
  } catch (error) {
    console.error("Error saving settings:", error);
    throw error;
  }
}

function EditCustomTerminalForm({
  settings,
  onSettingsChange,
}: {
  settings: Settings;
  onSettingsChange: (settings: Settings) => Promise<void>;
}) {
  const { pop } = useNavigation();

  const handleSubmit = async (values: { customTerminal: string }) => {
    await onSettingsChange({ ...settings, customTerminal: values.customTerminal });
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Custom Terminal" icon={Icon.Check} onSubmit={handleSubmit} />
          <Action title="Done" icon={Icon.Check} onAction={pop} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="customTerminal"
        title="Custom Terminal Name"
        placeholder="Enter terminal application name (e.g., Alacritty, WezTerm)"
        value={settings.customTerminal || ""}
      />
      <Form.Description text="Enter the exact name of the terminal application as it appears in macOS Applications folder or in the application's bundle identifier." />
    </Form>
  );
}

export default function Command() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeSettings = async () => {
      try {
        const loadedSettings = await loadSettings();
        setSettings(loadedSettings);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load settings",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsLoading(false);
      }
    };

    initializeSettings();
  }, []);

  const handleSettingsChange = async (newSettings: Settings) => {
    try {
      await saveSettings(newSettings);
      setSettings(newSettings);
      await showToast({
        style: Toast.Style.Success,
        title: "Settings saved",
        message: "Default vibe agent updated successfully",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to save settings",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search settings...">
      <List.Section title="Available Agents">
        {AGENT_OPTIONS.map((agent) => {
          const isDefault = agent.id === settings.defaultVibeAgent;

          return (
            <List.Item
              key={agent.id}
              icon={isDefault ? Icon.CheckCircle : Icon.Circle}
              title={agent.title}
              subtitle={agent.description}
              accessories={[
                {
                  tag: {
                    value: isDefault ? "Default" : "Available",
                    color: isDefault ? Color.Green : Color.SecondaryText,
                  },
                },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Set as Default"
                    icon={Icon.Star}
                    onAction={async () => {
                      if (agent.id !== settings.defaultVibeAgent) {
                        await handleSettingsChange({ ...settings, defaultVibeAgent: agent.id });
                      }
                    }}
                  />
                  <Action.CopyToClipboard title="Copy Agent Name" content={agent.title} />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>

      <List.Section title="Package Managers">
        {PACKAGE_MANAGER_OPTIONS.map((pm) => {
          const isDefault = pm.id === settings.packageManager;

          return (
            <List.Item
              key={pm.id}
              icon={isDefault ? Icon.CheckCircle : Icon.Circle}
              title={pm.title}
              subtitle={pm.description}
              accessories={[
                {
                  tag: {
                    value: isDefault ? "Default" : "Available",
                    color: isDefault ? Color.Green : Color.SecondaryText,
                  },
                },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Set as Default"
                    icon={Icon.Star}
                    onAction={async () => {
                      if (pm.id !== settings.packageManager) {
                        await handleSettingsChange({ ...settings, packageManager: pm.id });
                      }
                    }}
                  />
                  <Action.CopyToClipboard title="Copy Package Manager Name" content={pm.title} />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>

      <List.Section title="Terminals">
        {TERMINAL_OPTIONS.map((terminal) => {
          const isDefault = terminal.id === settings.defaultTerminal;

          return (
            <List.Item
              key={terminal.id}
              icon={isDefault ? Icon.CheckCircle : Icon.Circle}
              title={terminal.title}
              subtitle={terminal.description}
              accessories={[
                {
                  tag: {
                    value: isDefault ? "Default" : "Available",
                    color: isDefault ? Color.Green : Color.SecondaryText,
                  },
                },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Set as Default"
                    icon={Icon.Star}
                    onAction={async () => {
                      if (terminal.id !== settings.defaultTerminal) {
                        await handleSettingsChange({ ...settings, defaultTerminal: terminal.id });
                      }
                    }}
                  />
                  <Action.CopyToClipboard title="Copy Terminal Name" content={terminal.title} />
                </ActionPanel>
              }
            />
          );
        })}

        {settings.defaultTerminal === "custom" && (
          <List.Item
            key="custom-terminal-name"
            icon={Icon.Gear}
            title="Custom Terminal Name"
            subtitle={settings.customTerminal || "Not set"}
            accessories={[
              {
                tag: {
                  value: "Custom",
                  color: Color.Blue,
                },
              },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Edit Custom Terminal"
                  icon={Icon.Pencil}
                  target={<EditCustomTerminalForm settings={settings} onSettingsChange={handleSettingsChange} />}
                />
                <Action.CopyToClipboard title="Copy Custom Terminal Name" content={settings.customTerminal || ""} />
              </ActionPanel>
            }
          />
        )}
      </List.Section>

      <List.Section title="Launch Mode">
        <List.Item
          key="yolo-toggle"
          icon={Icon.Bolt}
          title="YOLO Mode"
          subtitle={
            settings.yoloEnabled
              ? "Enabled - Skip confirmations when launching agents"
              : "Disabled - Normal agent launch behavior"
          }
          accessories={[
            {
              tag: {
                value: settings.yoloEnabled ? "Enabled" : "Disabled",
                color: settings.yoloEnabled ? Color.Green : Color.Red,
              },
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                title={settings.yoloEnabled ? "Disable Yolo Mode" : "Enable Yolo Mode"}
                icon={settings.yoloEnabled ? Icon.XMarkCircle : Icon.CheckCircle}
                onAction={async () => {
                  await handleSettingsChange({ ...settings, yoloEnabled: !settings.yoloEnabled });
                }}
              />
              <Action.CopyToClipboard
                title="Copy Yolo Mode Status"
                content={settings.yoloEnabled ? "Enabled" : "Disabled"}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
