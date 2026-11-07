import {
  Action,
  ActionPanel,
  Color,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
  Keyboard,
  Alert,
  confirmAlert,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useCallback, useEffect, useRef, useState } from "react";
import { discoverRokus } from "./lib/discovery";
import { createClient, requestTimeoutMs } from "./lib/preferences";
import { describeRokuError, normalizeHost, RokuClient } from "./lib/roku";
import { getSavedDevices, removeDevice, renameDevice, saveDevices, selectDevice, updateDevice } from "./lib/storage";
import type { RokuDevice } from "./lib/types";
import { ConnectionHelp } from "./components/ConnectionHelp";
import { useDevices } from "./components/useDevices";

type Changed = () => void | Promise<void>;
type ManageProps = { onChanged?: Changed; discoverOnOpen?: boolean; navigationTitle?: string };

export default function ManageDevices({ onChanged, discoverOnOpen = false, navigationTitle }: ManageProps) {
  const saved = useDevices();
  const [found, setFound] = useState<RokuDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [scanError, setScanError] = useState<string>();
  const scanStarted = useRef(false);
  const didStartOnOpen = useRef(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  async function changed() {
    await saved.reload();
    await onChanged?.();
  }

  const scan = useCallback(async () => {
    if (scanStarted.current) return;
    scanStarted.current = true;
    setIsScanning(true);
    setScanError(undefined);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Looking for Roku TVs…" });
    try {
      const [results, existing] = await Promise.all([
        discoverRokus({ timeoutMs: Math.max(requestTimeoutMs(), 4000) }),
        getSavedDevices(),
      ]);
      if (!isMounted.current) return;
      const known = results.flatMap((device) => {
        const prior = existing.find((savedDevice) => savedDevice.id === device.id);
        return prior ? [{ ...device, name: prior.name }] : [];
      });
      if (known.length) {
        await saveDevices(known);
        await saved.reload();
        await onChanged?.();
      }
      if (!isMounted.current) return;
      setFound(results);
      setHasScanned(true);
      toast.style = Toast.Style.Success;
      toast.title = results.length
        ? `Found ${results.length} Roku ${results.length === 1 ? "device" : "devices"}`
        : "No Roku TVs found";
      toast.message = results.length ? "Select a TV to save it." : "Check the network, or add the TV by IP address.";
    } catch (cause) {
      if (!isMounted.current) return;
      const message = describeRokuError(cause);
      setScanError(message);
      toast.style = Toast.Style.Failure;
      toast.title = "Couldn't discover TVs";
      toast.message = message;
    } finally {
      scanStarted.current = false;
      if (isMounted.current) setIsScanning(false);
    }
  }, [saved.reload, onChanged]);

  useEffect(() => {
    if (discoverOnOpen && !didStartOnOpen.current) {
      didStartOnOpen.current = true;
      void scan();
    }
  }, [discoverOnOpen, scan]);

  async function add(device: RokuDevice) {
    try {
      await saveDevices([device]);
      if (saved.devices.length === 0) await selectDevice(device.id);
      await changed();
      await showToast({ style: Toast.Style.Success, title: "TV saved", message: device.name });
    } catch (cause) {
      await showFailureToast(describeRokuError(cause), { title: "Couldn't save TV" });
    }
  }

  async function refresh(device: RokuDevice) {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Checking TV…", message: device.name });
    try {
      const info = await createClient(device).getDeviceInfo();
      if (info.id !== device.id)
        throw new Error(
          "This address now belongs to a different Roku. Discover TVs again to update the saved address.",
        );
      await updateDevice({ ...info, name: device.name });
      await changed();
      toast.style = Toast.Style.Success;
      toast.title = "TV information refreshed";
      toast.message = device.name;
    } catch (cause) {
      toast.style = Toast.Style.Failure;
      toast.title = "Couldn't refresh TV";
      toast.message = describeRokuError(cause);
    }
  }

  const newDevices = found.filter((device) => !saved.devices.some((existing) => existing.id === device.id));
  const setupActions = (
    <ActionPanel.Section title="Add TVs">
      <Action
        title="Discover TVs"
        icon={Icon.MagnifyingGlass}
        onAction={scan}
        shortcut={Keyboard.Shortcut.Common.Refresh}
      />
      <Action.Push
        title="Add TV by IP Address"
        icon={Icon.Plus}
        target={<AddDeviceForm useAsDefault={saved.devices.length === 0} onChanged={changed} />}
      />
      <Action.Push
        title="Connection Help"
        icon={Icon.Info}
        target={<ConnectionHelp message={scanError ?? saved.error} />}
      />
    </ActionPanel.Section>
  );

  return (
    <List
      isLoading={saved.isLoading || isScanning}
      navigationTitle={navigationTitle}
      searchBarPlaceholder="Search saved or discovered TVs…"
    >
      <List.EmptyView
        icon={Icon.Desktop}
        title={isScanning ? "Looking for TVs…" : "Add your Roku TV"}
        description={saved.error ?? "Discover TVs on the same network, or add one by its IP address."}
        actions={<ActionPanel>{setupActions}</ActionPanel>}
      />
      {saved.devices.length ? (
        <List.Section
          title="Saved TVs"
          subtitle={saved.selectedId ? "Your default is marked" : "Choose a default before controlling a TV"}
        >
          {saved.devices.map((device) => (
            <List.Item
              key={device.id}
              title={device.name}
              subtitle={device.model}
              keywords={[device.host, device.controlMode ?? ""]}
              icon={Icon.Desktop}
              accessories={[
                { text: device.host },
                ...(device.controlMode?.toLowerCase() === "limited"
                  ? [{ tag: { value: "Limited control", color: Color.Orange } }]
                  : []),
                ...(saved.selectedId === device.id
                  ? [{ icon: { source: Icon.Checkmark, tintColor: Color.Green }, tooltip: "Default TV" }]
                  : []),
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Use as Default TV"
                    icon={Icon.Checkmark}
                    onAction={async () => {
                      await saved.choose(device.id);
                      await onChanged?.();
                    }}
                  />
                  <Action.Push
                    title="Rename TV"
                    icon={Icon.Pencil}
                    target={<RenameDeviceForm device={device} onChanged={changed} />}
                  />
                  <Action title="Refresh TV Information" icon={Icon.ArrowClockwise} onAction={() => refresh(device)} />
                  <Action.Push
                    title="Enable Network Control"
                    icon={Icon.Info}
                    target={<ConnectionHelp device={device} />}
                  />
                  <Action
                    title="Remove Saved TV"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={async () => {
                      const confirmed = await confirmAlert({
                        title: "Remove Saved TV?",
                        message: `${device.name} will be removed from Raycast. The TV itself is not changed.`,
                        primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
                      });
                      if (!confirmed) return;
                      try {
                        await removeDevice(device.id);
                        await changed();
                        await showToast({
                          style: Toast.Style.Success,
                          title: "Saved TV removed",
                          message: device.name,
                        });
                      } catch (cause) {
                        await showFailureToast(describeRokuError(cause), { title: "Couldn't remove TV" });
                      }
                    }}
                  />
                  {setupActions}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : null}
      {newDevices.length ? (
        <List.Section title="Discovered on Your Network" subtitle="Select a TV to save it">
          {newDevices.map((device) => (
            <List.Item
              key={device.id}
              title={device.name}
              subtitle={device.model}
              icon={Icon.Plus}
              accessories={[{ text: device.host }]}
              actions={
                <ActionPanel>
                  <Action title="Save This TV" icon={Icon.Plus} onAction={() => add(device)} />
                  {setupActions}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : null}
      {scanError || (hasScanned && newDevices.length === 0) ? (
        <List.Section title="Discovery">
          <List.Item
            title={
              scanError
                ? "Couldn't discover TVs"
                : found.length
                  ? "All discovered TVs are already saved"
                  : "No Roku TVs found"
            }
            subtitle={scanError ? "View connection help for details" : "Try another scan or enter the TV's IP address"}
            icon={scanError ? Icon.ExclamationMark : Icon.MagnifyingGlass}
            actions={<ActionPanel>{setupActions}</ActionPanel>}
          />
        </List.Section>
      ) : null}
    </List>
  );
}

export function AddDeviceForm({ useAsDefault = false, onChanged }: { useAsDefault?: boolean; onChanged?: Changed }) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [hostError, setHostError] = useState<string>();
  const busy = useRef(false);

  async function submit(values: { host: string; name: string; useAsDefault: boolean }) {
    if (busy.current) return;
    let host: string;
    try {
      host = normalizeHost(values.host.trim());
    } catch (cause) {
      setHostError(describeRokuError(cause));
      return;
    }
    busy.current = true;
    setIsLoading(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Checking Roku TV…", message: host });
    try {
      const info = await new RokuClient(host, { timeoutMs: requestTimeoutMs() }).getDeviceInfo();
      const device = { ...info, name: values.name.trim() || info.name };
      await saveDevices([device]);
      if (values.name.trim()) await renameDevice(device.id, values.name.trim());
      if (values.useAsDefault) await selectDevice(device.id);
      await onChanged?.();
      toast.style = Toast.Style.Success;
      toast.title = "TV verified and saved";
      toast.message = device.name;
      pop();
    } catch (cause) {
      toast.style = Toast.Style.Failure;
      toast.title = "Couldn't connect to Roku";
      toast.message = describeRokuError(cause);
    } finally {
      busy.current = false;
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Add Roku TV"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Check and Save TV" icon={Icon.Plus} onSubmit={submit} />
          <Action.Push title="Connection Help" icon={Icon.Info} target={<ConnectionHelp />} />
        </ActionPanel>
      }
    >
      <Form.Description text="Find the TV's IP address in Roku Settings → Network → About. The TV is checked before saving." />
      <Form.TextField
        id="host"
        title="IP Address or Hostname"
        placeholder="192.168.1.50"
        error={hostError}
        onChange={() => setHostError(undefined)}
        info="Enter the address without http:// or a port."
      />
      <Form.TextField id="name" title="Name" placeholder="Living Room (optional)" />
      <Form.Checkbox
        id="useAsDefault"
        title="Default TV"
        label="Use this TV as my default"
        defaultValue={useAsDefault}
      />
    </Form>
  );
}

function RenameDeviceForm({ device, onChanged }: { device: RokuDevice; onChanged?: Changed }) {
  const { pop } = useNavigation();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);
  async function submit(values: { name: string }) {
    const name = values.name.trim();
    if (!name) {
      setError("Enter a name for this TV.");
      return;
    }
    setIsLoading(true);
    try {
      await renameDevice(device.id, name);
      await onChanged?.();
      await showToast({ style: Toast.Style.Success, title: "TV renamed", message: name });
      pop();
    } catch (cause) {
      await showFailureToast(describeRokuError(cause), { title: "Couldn't rename TV" });
    } finally {
      setIsLoading(false);
    }
  }
  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Rename Roku TV"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Name" icon={Icon.Checkmark} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="Living Room"
        defaultValue={device.name}
        error={error}
        onChange={() => setError(undefined)}
      />
    </Form>
  );
}
