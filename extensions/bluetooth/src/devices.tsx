import { Action, ActionPanel, Color, Icon, List, showToast, Toast, Keyboard } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { Device, listDevices, setConnected, setRadio } from "./bluetooth";

export default function Command() {
  const { data, isLoading, revalidate } = useCachedPromise(listDevices, [], {
    initialData: { radio: "Off" as const, devices: [] as Device[] },
  });
  const { radio, devices } = data;
  const radioOn = radio === "On";

  /** Runs a mutation behind a toast, then refreshes the list. */
  async function perform(title: string, success: string, action: () => Promise<void>) {
    const toast = await showToast({ style: Toast.Style.Animated, title });
    try {
      await action();
      toast.style = Toast.Style.Success;
      toast.title = success;
    } catch (error) {
      toast.hide();
      await showFailureToast(error, {
        title: `Could not ${title.toLowerCase()}`,
      });
    }
    revalidate();
  }

  const toggleRadio = (
    <Action
      title={radioOn ? "Turn Bluetooth off" : "Turn Bluetooth on"}
      icon={radioOn ? Icon.Power : Icon.Bolt}
      shortcut={{ modifiers: ["ctrl", "shift"], key: "b" }}
      onAction={() =>
        perform(
          radioOn ? "Turning Bluetooth off" : "Turning Bluetooth on",
          radioOn ? "Bluetooth off" : "Bluetooth on",
          () => setRadio(radioOn ? "Off" : "On"),
        )
      }
    />
  );

  const refresh = (
    <Action
      title="Refresh"
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={revalidate}
    />
  );

  const connected = devices.filter((device) => device.connected);
  const available = devices.filter((device) => !device.connected);

  function item(device: Device) {
    return (
      <List.Item
        key={device.address}
        icon={{
          source: device.connected ? Icon.CheckCircle : Icon.Circle,
          tintColor: device.connected ? Color.Green : Color.SecondaryText,
        }}
        title={device.name}
        subtitle={device.connectable ? undefined : "Managed by Windows"}
        accessories={[{ text: device.connected ? "Connected" : "Not Connected" }]}
        actions={
          <ActionPanel>
            {/* The Win32 service API only acts on Classic devices; LE ones would error. */}
            {device.connectable && (
              <Action
                title={device.connected ? "Disconnect" : "Connect"}
                icon={device.connected ? Icon.Xmark : Icon.Plug}
                onAction={() =>
                  perform(
                    `${device.connected ? "Disconnecting" : "Connecting"} ${device.name}`,
                    `${device.name} ${device.connected ? "disconnected" : "connected"}`,
                    () => setConnected(device.address, !device.connected),
                  )
                }
              />
            )}
            <Action.CopyToClipboard title="Copy Address" content={device.address} />
            {refresh}
            {toggleRadio}
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search paired devices">
      {!radioOn ? (
        <List.EmptyView
          icon={{
            source: Icon.BatteryDisabled,
            tintColor: Color.SecondaryText,
          }}
          title="Bluetooth Is Off"
          description="Turn the radio on to see your paired devices."
          actions={<ActionPanel>{toggleRadio}</ActionPanel>}
        />
      ) : (
        <>
          <List.Section title="Connected" subtitle={`${connected.length}`}>
            {connected.map(item)}
          </List.Section>
          <List.Section title="Available" subtitle={`${available.length}`}>
            {available.map(item)}
          </List.Section>
        </>
      )}
    </List>
  );
}
