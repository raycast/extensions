import { Action, ActionPanel, Form, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useState, useEffect } from "react";
import { Explorer } from "@harmonyhub/discover";
import {
  saveHubIp,
  clearAllConfig,
  discoverHubConfig,
  getHubIp,
  getShortcuts,
  saveShortcuts,
  Shortcut,
  Activity,
  Device,
  DeviceCommand,
} from "./lib/harmony";

// ---- Step 1: Discover hubs ----

export default function SetupHub() {
  const [hubIp, setHubIp] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    (async () => {
      const ip = await getHubIp();
      setHubIp(ip);
      setIsChecking(false);
    })();
  }, []);

  if (isChecking) {
    return <List isLoading={true} />;
  }

  if (hubIp) {
    return <ConfigureShortcuts hubIp={hubIp} onReset={() => setHubIp(null)} />;
  }

  return <DiscoverHubs onHubSelected={(ip) => setHubIp(ip)} />;
}

function DiscoverHubs({ onHubSelected }: { onHubSelected: (ip: string) => void }) {
  const [hubs, setHubs] = useState<Array<{ ip: string; friendlyName: string; uuid: string }>>([]);
  const [isSearching, setIsSearching] = useState(true);

  useEffect(() => {
    const explorer = new Explorer(61991);
    const found: Array<{ ip: string; friendlyName: string; uuid: string }> = [];

    explorer.on("online", (hub: { ip: string; friendlyName: string; uuid: string }) => {
      if (!found.some((h) => h.ip === hub.ip)) {
        found.push(hub);
        setHubs([...found]);
      }
    });

    explorer.start();

    const timeout = setTimeout(() => {
      explorer.stop();
      setIsSearching(false);
    }, 10000);

    return () => {
      clearTimeout(timeout);
      explorer.stop();
    };
  }, []);

  return (
    <List isLoading={isSearching} searchBarPlaceholder="Searching for Harmony Hubs...">
      {hubs.map((hub) => (
        <List.Item
          key={hub.uuid}
          title={hub.friendlyName}
          subtitle={hub.ip}
          icon={Icon.Globe}
          actions={
            <ActionPanel>
              <Action
                title="Use This Hub"
                icon={Icon.CheckCircle}
                onAction={async () => {
                  await clearAllConfig();
                  await saveHubIp(hub.ip);
                  await showToast({ style: Toast.Style.Success, title: "Hub Saved", message: hub.friendlyName });
                  onHubSelected(hub.ip);
                }}
              />
            </ActionPanel>
          }
        />
      ))}
      {!isSearching && hubs.length === 0 && (
        <List.EmptyView
          title="No Hubs Found"
          description="Make sure your Harmony Hub is powered on and on the same network"
          icon={Icon.Warning}
        />
      )}
    </List>
  );
}

// ---- Step 2: Configure shortcuts from hub's activities and devices ----

function ConfigureShortcuts({ hubIp, onReset }: { hubIp: string; onReset: () => void }) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  useEffect(() => {
    (async () => {
      try {
        const config = await discoverHubConfig(hubIp);
        setActivities(config.activities);
        setDevices(config.devices);
        const existing = await getShortcuts();
        setShortcuts(existing);
      } catch (error) {
        await showToast({ style: Toast.Style.Failure, title: "Connection Failed", message: String(error) });
      }
      setIsLoading(false);
    })();
  }, [hubIp]);

  const addActivityShortcut = async (activity: Activity) => {
    if (shortcuts.length >= 10) {
      await showToast({ style: Toast.Style.Failure, title: "Max 10 shortcuts" });
      return;
    }
    if (shortcuts.some((s) => s.type === "activity" && s.activityId === activity.id)) {
      await showToast({ style: Toast.Style.Failure, title: "Already added" });
      return;
    }
    const shortcut: Shortcut = {
      id: `activity-${activity.id}`,
      label: activity.name,
      icon: Icon.Play,
      type: "activity",
      activityId: activity.id,
    };
    const updated = [...shortcuts, shortcut];
    setShortcuts(updated);
    await saveShortcuts(updated);
    await showToast({ style: Toast.Style.Success, title: `Added: ${activity.name}` });
  };

  const addOffShortcut = async () => {
    if (shortcuts.length >= 10) {
      await showToast({ style: Toast.Style.Failure, title: "Max 10 shortcuts" });
      return;
    }
    if (shortcuts.some((s) => s.type === "off")) {
      await showToast({ style: Toast.Style.Failure, title: "Already added" });
      return;
    }
    const shortcut: Shortcut = {
      id: "all-off",
      label: "All Off",
      icon: Icon.Power,
      type: "off",
    };
    const updated = [...shortcuts, shortcut];
    setShortcuts(updated);
    await saveShortcuts(updated);
    await showToast({ style: Toast.Style.Success, title: "Added: All Off" });
  };

  const addDeviceCommandShortcut = async (device: Device, command: DeviceCommand, label: string, repeats: number) => {
    if (shortcuts.length >= 10) {
      await showToast({ style: Toast.Style.Failure, title: "Max 10 shortcuts" });
      return;
    }
    const id = `cmd-${device.id}-${command.name}-${repeats}`;
    if (shortcuts.some((s) => s.id === id)) {
      await showToast({ style: Toast.Style.Failure, title: "Already added" });
      return;
    }
    const shortcut: Shortcut = {
      id,
      label,
      icon: Icon.SpeakerOn,
      type: "device-command",
      deviceId: device.id,
      commandName: command.name,
      commandType: command.type,
      repeats,
    };
    const updated = [...shortcuts, shortcut];
    setShortcuts(updated);
    await saveShortcuts(updated);
    await showToast({ style: Toast.Style.Success, title: `Added: ${label}` });
  };

  const removeShortcut = async (id: string) => {
    const updated = shortcuts.filter((s) => s.id !== id);
    setShortcuts(updated);
    await saveShortcuts(updated);
    await showToast({ style: Toast.Style.Success, title: "Removed" });
  };

  const moveShortcut = async (id: string, direction: "up" | "down") => {
    const idx = shortcuts.findIndex((s) => s.id === id);
    if (idx === -1) return;
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= shortcuts.length) return;
    const updated = [...shortcuts];
    [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
    setShortcuts(updated);
    await saveShortcuts(updated);
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Add shortcuts from your hub...">
      {/* Current shortcuts */}
      {shortcuts.length > 0 && (
        <List.Section title={`Your Shortcuts (${shortcuts.length}/10)`}>
          {shortcuts.map((s, i) => (
            <List.Item
              key={s.id}
              title={s.label}
              icon={{ source: s.icon || Icon.Circle }}
              subtitle={s.type === "device-command" && s.repeats ? `x${s.repeats}` : s.type}
              accessories={[{ text: `#${i + 1}` }]}
              actions={
                <ActionPanel>
                  <Action
                    title="Remove Shortcut"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => removeShortcut(s.id)}
                  />
                  <Action title="Move Up" icon={Icon.ArrowUp} onAction={() => moveShortcut(s.id, "up")} />
                  <Action title="Move Down" icon={Icon.ArrowDown} onAction={() => moveShortcut(s.id, "down")} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {/* All Off */}
      <List.Section title="Power">
        <List.Item
          title="All Off"
          icon={Icon.Power}
          subtitle="Turn off all devices"
          accessories={[
            shortcuts.some((s) => s.type === "off") ? { icon: Icon.CheckCircle, tooltip: "Added" } : { text: "Add" },
          ]}
          actions={
            <ActionPanel>
              <Action title="Add Shortcut" icon={Icon.Plus} onAction={addOffShortcut} />
            </ActionPanel>
          }
        />
      </List.Section>

      {/* Activities */}
      <List.Section title="Activities">
        {activities.map((activity) => {
          const isAdded = shortcuts.some((s) => s.type === "activity" && s.activityId === activity.id);
          return (
            <List.Item
              key={activity.id}
              title={activity.name}
              icon={Icon.Play}
              accessories={[isAdded ? { icon: Icon.CheckCircle, tooltip: "Added" } : { text: "Add" }]}
              actions={
                <ActionPanel>
                  <Action title="Add Shortcut" icon={Icon.Plus} onAction={() => addActivityShortcut(activity)} />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>

      {/* Devices — show volume-like commands with repeat options */}
      {devices.map((device) => {
        const volumeCommands = device.commands.filter(
          (c) =>
            c.name.toLowerCase().includes("volume") ||
            c.name.toLowerCase().includes("mute") ||
            c.name.toLowerCase().includes("channel") ||
            c.name.toLowerCase().includes("input"),
        );
        if (volumeCommands.length === 0) return null;
        return (
          <List.Section key={device.id} title={device.name}>
            {volumeCommands.map((cmd) => (
              <List.Item
                key={`${device.id}-${cmd.name}`}
                title={cmd.name}
                icon={Icon.SpeakerOn}
                subtitle={device.name}
                actions={
                  <ActionPanel>
                    <Action
                      title="Add as X1"
                      icon={Icon.Plus}
                      onAction={() => addDeviceCommandShortcut(device, cmd, `${device.name}: ${cmd.name}`, 1)}
                    />
                    <Action
                      title="Add as X5"
                      icon={Icon.Plus}
                      onAction={() => addDeviceCommandShortcut(device, cmd, `${device.name}: ${cmd.name} x5`, 5)}
                    />
                    <Action
                      title="Add as X10"
                      icon={Icon.Plus}
                      onAction={() => addDeviceCommandShortcut(device, cmd, `${device.name}: ${cmd.name} x10`, 10)}
                    />
                    <Action
                      title="Add with Custom Repeat…"
                      icon={Icon.Plus}
                      onAction={() =>
                        push(<CustomRepeatForm device={device} command={cmd} onAdd={addDeviceCommandShortcut} />)
                      }
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        );
      })}

      {/* Reset */}
      <List.Section title="Settings">
        <List.Item
          title="Reset Hub"
          icon={Icon.ArrowCounterClockwise}
          subtitle="Forget this hub and start over"
          actions={
            <ActionPanel>
              <Action
                title="Reset Everything"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={async () => {
                  await clearAllConfig();
                  await showToast({ style: Toast.Style.Success, title: "Reset complete" });
                  onReset();
                }}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

// ---- Custom repeat count form ----

function CustomRepeatForm({
  device,
  command,
  onAdd,
}: {
  device: Device;
  command: DeviceCommand;
  onAdd: (device: Device, command: DeviceCommand, label: string, repeats: number) => Promise<void>;
}) {
  const { pop } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add Shortcut"
            onSubmit={async (values: { repeats: string; label: string }) => {
              const repeats = parseInt(values.repeats, 10);
              if (isNaN(repeats) || repeats < 1 || repeats > 50) {
                await showToast({ style: Toast.Style.Failure, title: "Repeats must be 1-50" });
                return;
              }
              await onAdd(device, command, values.label, repeats);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="label"
        title="Label"
        defaultValue={`${device.name}: ${command.name} x5`}
        placeholder="What to call this shortcut"
      />
      <Form.TextField id="repeats" title="Repeat Count" defaultValue="5" placeholder="How many times to send" />
    </Form>
  );
}
