import {
  ActionPanel,
  Action,
  Color,
  List,
  showToast,
  Toast,
  Icon,
  Form,
  useNavigation,
  open,
} from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { checkDependencies, installDependencies } from "./utils/deps";
import {
  getAvailableDisplays,
  saveDisplay,
  removeDisplay,
  markDisplayConnected,
  scanDisplaysFromSystem,
  getQuickConnectDisplay,
  setQuickConnectDisplay,
  clearQuickConnectDisplay,
  Display,
} from "./utils/displays";
import { connectToDisplay } from "./utils/connect";

const DISPLAYS_PANE_URL =
  "x-apple.systempreferences:com.apple.Displays-Settings.extension";

function AddDisplayForm({ onAdd }: { onAdd: (name: string) => void }) {
  const { pop } = useNavigation();
  const [name, setName] = useState("");

  async function handleSubmit() {
    if (!name.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: "Display name is required",
      });
      return;
    }
    await saveDisplay({ name: name.trim(), type: "display" });
    onAdd(name.trim());
    pop();
    showToast({
      style: Toast.Style.Success,
      title: "Display added",
      message: name.trim(),
    });
  }

  async function openDisplaySettings() {
    await open(DISPLAYS_PANE_URL);
    showToast({
      style: Toast.Style.Success,
      title: "Opened System Settings",
      message: 'Look for names under "Mirror or extend to"',
    });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Display" onSubmit={handleSubmit} />
          <Action
            title="Open Display Settings"
            icon={Icon.Gear}
            onAction={openDisplaySettings}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="How to find display names"
        text='Press ⌘O to open System Settings > Displays. Click the "+" button and look for names under "Mirror or extend to".'
      />
      <Form.TextField
        id="name"
        title="Display Name"
        placeholder="e.g. Pavzagor MacBook Pro 14"
        value={name}
        onChange={setName}
        info="Copy the exact name as shown in the menu"
      />
    </Form>
  );
}

export default function Command() {
  const [hasDeps, setHasDeps] = useState<boolean | null>(null);
  const [displays, setDisplays] = useState<Display[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [quickConnectName, setQuickConnectName] = useState<
    string | undefined
  >();

  const loadQuickConnect = useCallback(async () => {
    setQuickConnectName(await getQuickConnectDisplay());
  }, []);

  const loadDisplays = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await getAvailableDisplays();
      setDisplays(list);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load displays",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    async function init() {
      const deps = await checkDependencies();
      setHasDeps(deps);
      if (deps) {
        loadDisplays();
        loadQuickConnect();
      } else {
        setIsLoading(false);
      }
    }
    init();
  }, [loadDisplays, loadQuickConnect]);

  const sortedDisplays = [...displays].sort((a, b) => {
    if (a.name === quickConnectName) return -1;
    if (b.name === quickConnectName) return 1;
    if (a.lastConnected && b.lastConnected)
      return b.lastConnected - a.lastConnected;
    if (a.lastConnected) return -1;
    if (b.lastConnected) return 1;
    return a.name.localeCompare(b.name);
  });

  async function handleRemove(name: string) {
    await removeDisplay(name);
    setDisplays((prev) => prev.filter((d) => d.name !== name));
    showToast({ style: Toast.Style.Success, title: "Display removed" });
  }

  async function handleScan() {
    setIsLoading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Scanning...",
      message: "Opening System Settings to find displays",
    });

    try {
      const scanned = await scanDisplaysFromSystem();
      if (scanned.length === 0) {
        toast.style = Toast.Style.Failure;
        toast.title = "No displays found";
        toast.message = "Make sure other devices are nearby and unlocked";
      } else {
        // Save all scanned displays
        for (const display of scanned) {
          await saveDisplay(display);
        }
        await loadDisplays();
        toast.style = Toast.Style.Success;
        toast.title = `Found ${scanned.length} display${scanned.length > 1 ? "s" : ""}`;
        toast.message = scanned.map((d) => d.name).join(", ");
      }
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Scan failed";
      toast.message = String(error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleConnect(display: Display) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "⏳ Connecting...",
      message: `Opening System Settings...`,
    });

    try {
      const result = await connectToDisplay(display.name, (progress) => {
        // Optimistic update after menu click completes (~2-3s)
        if (progress.phase === "clicked" && progress.success) {
          toast.style = Toast.Style.Success;
          if (progress.connected) {
            toast.title = "🎯 Connected!";
            toast.message = `${display.name} • 🔊 Audio preserved`;
          } else {
            toast.title = "🔌 Disconnected";
            toast.message = display.name;
          }
        }
      });

      // Mark as recently used
      await markDisplayConnected(display.name);

      // Verification complete - only update if different from optimistic state
      if (result.success && result.phase === "verified") {
        toast.style = Toast.Style.Success;
        if (result.connected) {
          toast.title = "✅ Connected";
          toast.message = `${display.name} • 🔊 Audio preserved`;
        } else {
          toast.title = "✅ Disconnected";
          toast.message = display.name;
        }
      }
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "❌ Connection Failed";
      toast.message = String(error);
    }
  }

  if (hasDeps === false) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Warning}
          title="Missing Dependencies"
          description="SwitchAudioSource is required to preserve audio output."
          actions={
            <ActionPanel>
              <Action
                title="Install Dependencies"
                onAction={installDependencies}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search monitors and displays..."
    >
      <List.Section title="Your Displays">
        {sortedDisplays.map((display) => (
          <List.Item
            key={display.name}
            title={display.name}
            icon="icon.png"
            keywords={[
              "monitor",
              "airplay",
              "display",
              "sidecar",
              "screen",
              "extend",
              "ipad",
              "mac",
            ]}
            accessories={[
              ...(quickConnectName === display.name
                ? [{ tag: { value: "Quick Connect", color: Color.Blue } }]
                : []),
              ...(display.lastConnected
                ? [
                    {
                      date: new Date(display.lastConnected),
                      tooltip: "Last connected",
                    },
                  ]
                : []),
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Connect"
                  icon={Icon.Link}
                  onAction={() => handleConnect(display)}
                />
                {quickConnectName === display.name ? (
                  <Action
                    title="Clear Quick Connect"
                    icon={Icon.StarDisabled}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "q" }}
                    onAction={async () => {
                      await clearQuickConnectDisplay();
                      setQuickConnectName(undefined);
                      showToast({
                        style: Toast.Style.Success,
                        title: "Quick Connect cleared",
                      });
                    }}
                  />
                ) : (
                  <Action
                    title="Set as Quick Connect"
                    icon={Icon.Star}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "q" }}
                    onAction={async () => {
                      await setQuickConnectDisplay(display.name);
                      setQuickConnectName(display.name);
                      showToast({
                        style: Toast.Style.Success,
                        title: "Quick Connect set",
                        message: display.name,
                      });
                    }}
                  />
                )}
                <Action
                  title="Scan for Displays"
                  icon={Icon.MagnifyingGlass}
                  onAction={handleScan}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
                <Action.Push
                  title="Add Display Manually"
                  icon={Icon.Plus}
                  target={<AddDisplayForm onAdd={() => loadDisplays()} />}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                />
                <Action
                  title="Open Display Settings"
                  icon={Icon.Gear}
                  onAction={() => open(DISPLAYS_PANE_URL)}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                />
                <Action
                  title="Remove Display"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => handleRemove(display.name)}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      {!isLoading && displays.length === 0 && (
        <List.EmptyView
          icon={Icon.Desktop}
          title="No displays configured"
          description="Press Enter to scan for available displays, or ⌘N to add manually."
          actions={
            <ActionPanel>
              <Action
                title="Scan for Displays"
                icon={Icon.MagnifyingGlass}
                onAction={handleScan}
              />
              <Action.Push
                title="Add Display Manually"
                icon={Icon.Plus}
                target={<AddDisplayForm onAdd={() => loadDisplays()} />}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
              />
              <Action
                title="Open Display Settings"
                icon={Icon.Gear}
                onAction={() => open(DISPLAYS_PANE_URL)}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
