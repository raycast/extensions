import {
  Action,
  ActionPanel,
  Color,
  Form,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { probeEnvironment } from "./api";
import { exchangeToken, parsePairingInput } from "./auth";
import { appShortcut } from "./raycast-ui";
import {
  addDevice,
  getActiveDeviceId,
  getDevices,
  removeDevice,
  setActiveDeviceId,
  updateDevice,
} from "./storage";
import { Device } from "./types";

export default function SetupDevice() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function reload() {
    const [devs, aid] = await Promise.all([getDevices(), getActiveDeviceId()]);
    setDevices(devs);
    setActiveId(aid);
    setIsLoading(false);
  }

  useEffect(() => {
    void reload();
  }, []);

  async function handleSetActive(id: string) {
    await setActiveDeviceId(id);
    setActiveId(id);
    await showToast(Toast.Style.Success, "Active device updated");
  }

  async function handleRemove(device: Device) {
    if (
      await confirmAlert({
        title: "Remove Device",
        message: `Remove "${device.name}"? You'll need to re-pair to use it again.`,
      })
    ) {
      await removeDevice(device.id);
      await reload();
      await showToast(Toast.Style.Success, "Device removed");
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search devices...">
      {devices.length === 0 && !isLoading ? (
        <>
          <List.EmptyView
            icon={Icon.Monitor}
            title="No Devices Configured"
            description="Add your T3 Code server to get started. You'll need the pairing URL from the T3 Code desktop app."
            actions={
              <ActionPanel>
                <Action.Push
                  title="Add Device"
                  icon={Icon.Plus}
                  shortcut={appShortcut("n")}
                  target={<AddDeviceForm onDone={reload} />}
                />
              </ActionPanel>
            }
          />
          <List.Item
            icon={Icon.Plus}
            title="Add Device"
            subtitle="Connect to a T3 Code server"
            actions={
              <ActionPanel>
                <Action.Push
                  title="Add Device"
                  icon={Icon.Plus}
                  shortcut={appShortcut("n")}
                  target={<AddDeviceForm onDone={reload} />}
                />
              </ActionPanel>
            }
          />
        </>
      ) : (
        <List.Section title={`Devices (${devices.length})`}>
          {devices.map((device) => {
            const isActive = device.id === activeId;
            return (
              <List.Item
                key={device.id}
                icon={{
                  source: Icon.Circle,
                  tintColor: isActive ? Color.Green : Color.SecondaryText,
                }}
                title={device.name}
                subtitle={device.baseUrl}
                accessories={
                  isActive
                    ? [{ tag: { value: "Active", color: Color.Green } }]
                    : device.lastSeenAt
                      ? [{ text: timeAgo(device.lastSeenAt) }]
                      : []
                }
                keywords={[device.name, device.baseUrl]}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      <Action
                        title="Set as Active"
                        icon={Icon.Star}
                        shortcut={appShortcut("a", ["shift"])}
                        onAction={() => void handleSetActive(device.id)}
                      />
                      <Action.Push
                        title="Edit Device"
                        icon={Icon.Pencil}
                        shortcut={appShortcut("e")}
                        target={
                          <EditDeviceForm device={device} onDone={reload} />
                        }
                      />
                      <Action.Push
                        title="Repair Device"
                        icon={Icon.RotateClockwise}
                        shortcut={appShortcut("p", ["shift"])}
                        target={
                          <AddDeviceForm
                            existingDevice={device}
                            onDone={reload}
                          />
                        }
                      />
                      <Action
                        title="Remove Device"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        shortcut={appShortcut("backspace")}
                        onAction={() => void handleRemove(device)}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section>
                      <Action.Push
                        title="Add New Device"
                        icon={Icon.Plus}
                        shortcut={appShortcut("n")}
                        target={<AddDeviceForm onDone={reload} />}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}

export { AddDeviceForm as AddDeviceInline };

function AddDeviceForm({
  existingDevice,
  onDone,
}: {
  existingDevice?: Device;
  onDone: () => Promise<void>;
}) {
  const { pop } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(values: { name: string; pairingUrl: string }) {
    const name = values.name.trim();
    if (!name) {
      await showToast(Toast.Style.Failure, "Device name is required");
      return;
    }

    const { baseUrl, token } = parsePairingInput(values.pairingUrl);
    if (!token) {
      await showToast(
        Toast.Style.Failure,
        "Pairing URL must include a token (the #token=... part)",
      );
      return;
    }

    setIsSubmitting(true);
    const toast = await showToast(Toast.Style.Animated, "Connecting...");
    try {
      const result = await exchangeToken(baseUrl, token);
      const env = await probeEnvironment(baseUrl);
      const expiresAt = new Date(
        Date.now() + result.expires_in * 1000,
      ).toISOString();

      if (existingDevice) {
        await updateDevice(existingDevice.id, {
          name,
          baseUrl,
          environmentId: env.environmentId,
          accessToken: result.access_token,
          tokenExpiresAt: expiresAt,
          pairingUrl: undefined,
        });
      } else {
        const device: Device = {
          id: crypto.randomUUID(),
          name,
          baseUrl,
          environmentId: env.environmentId,
          accessToken: result.access_token,
          tokenExpiresAt: expiresAt,
          addedAt: new Date().toISOString(),
          lastSeenAt: null,
        };
        await addDevice(device);
        await setActiveDeviceId(device.id);
      }

      toast.style = Toast.Style.Success;
      toast.title = existingDevice ? "Device repaired" : "Device added";
      await onDone();
      pop();
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = e instanceof Error ? e.message : "Failed to connect";
      setIsSubmitting(false);
    }
  }

  async function handleTestConnection(pairingUrl: string) {
    const { baseUrl } = parsePairingInput(pairingUrl);
    if (!baseUrl) {
      await showToast(Toast.Style.Failure, "Enter a pairing URL first");
      return;
    }
    const toast = await showToast(
      Toast.Style.Animated,
      "Testing connection...",
    );
    try {
      const env = await probeEnvironment(baseUrl);
      toast.style = Toast.Style.Success;
      toast.title = `Server reachable — ${env.label} v${env.serverVersion}`;
    } catch {
      toast.style = Toast.Style.Failure;
      toast.title = "Cannot reach server";
      toast.message = "Check the URL and make sure T3 Code is running";
    }
  }

  return (
    <Form
      navigationTitle={existingDevice ? "Repair Device" : "Add T3 Code Device"}
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={existingDevice ? "Repair Device" : "Add Device"}
            icon={Icon.Plus}
            shortcut={appShortcut("return")}
            onSubmit={handleSubmit}
          />
          <Action.SubmitForm
            title="Test Connection"
            icon={Icon.Globe}
            shortcut={appShortcut("t")}
            onSubmit={(values: { pairingUrl: string }) =>
              void handleTestConnection(values.pairingUrl)
            }
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Device Name"
        placeholder="My MacBook Pro"
        defaultValue={existingDevice?.name ?? ""}
      />
      <Form.TextField
        id="pairingUrl"
        title="Pairing URL"
        placeholder="http://192.168.1.100:8080#token=..."
        info="In T3 Code desktop app, go to Settings → Devices → Add Device, then copy the pairing URL and paste it here."
        defaultValue={existingDevice ? `${existingDevice.baseUrl}#token=` : ""}
      />
      <Form.Description text="Supports: http://, https://, and Tailscale MagicDNS URLs." />
    </Form>
  );
}

function EditDeviceForm({
  device,
  onDone,
}: {
  device: Device;
  onDone: () => Promise<void>;
}) {
  const { pop } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(values: { name: string; baseUrl: string }) {
    const name = values.name.trim();
    const baseUrl = values.baseUrl.trim().replace(/\/$/, "");
    if (!name) {
      await showToast(Toast.Style.Failure, "Device name is required");
      return;
    }
    if (!baseUrl) {
      await showToast(Toast.Style.Failure, "Base URL is required");
      return;
    }

    setIsSubmitting(true);
    const toast = await showToast(
      Toast.Style.Animated,
      "Testing connection...",
    );
    try {
      const env = await probeEnvironment(baseUrl);
      await updateDevice(device.id, {
        name,
        baseUrl,
        environmentId: env.environmentId,
        lastSeenAt: new Date().toISOString(),
      });
      toast.style = Toast.Style.Success;
      toast.title = `Device updated — ${env.label} v${env.serverVersion}`;
      await onDone();
      pop();
    } catch {
      toast.style = Toast.Style.Failure;
      toast.title = "Cannot reach server at new URL";
      toast.message = "Device not updated. Check the URL and try again.";
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      navigationTitle="Edit Device"
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Changes"
            icon={Icon.Check}
            shortcut={appShortcut("return")}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Device Name"
        defaultValue={device.name}
      />
      <Form.TextField
        id="baseUrl"
        title="Base URL"
        defaultValue={device.baseUrl}
      />
    </Form>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
