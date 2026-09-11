import { Color, Icon, MenuBarExtra, launchCommand, LaunchType, showHUD } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { controlDevice, loadDevicesWithFallback } from "./utils/deviceSource";
import { describeError } from "./utils/functions";
import { Device, FunctionItem } from "./utils/interfaces";
import { extractSwitches, isSwitchStatus, switchKey } from "./utils/filters";
import { classifyDevice, cleanName, needsAttention, statusLine } from "./utils/deviceSemantics";

/**
 * A menu bar command has no view, so `showToast` renders nowhere. Every outcome here
 * has to be reported with a HUD or it looks like the click did nothing.
 */
export default function MenuBarCommand() {
  const [cachedDevices] = useCachedState<Device[]>("devices", []);

  const { data, isLoading, revalidate, mutate } = useCachedPromise(loadDevicesWithFallback, [], {
    initialData: { devices: cachedDevices ?? [], source: "cache" as const },
    keepPreviousData: true,
    onError: (error) => showHUD(describeError(error)),
  });

  const devices = data?.devices ?? cachedDevices ?? [];
  const cachedNameFor = (deviceId: string, code: string) =>
    (cachedDevices ?? []).find((device) => device.id === deviceId)?.status?.find((status) => status.code === code)
      ?.name;

  // Pinning is per device; readings come from the live list so the menu is not stale.
  const pinnedIds = new Set((cachedDevices ?? []).filter((device) => device.pinned).map((device) => device.id));
  const pinnedDevices = devices.filter((device) => pinnedIds.has(device.id));

  const controls = pinnedDevices.filter((device) => classifyDevice(device) === "control");
  const sensors = pinnedDevices.filter((device) => classifyDevice(device) === "sensor");
  const locks = pinnedDevices.filter((device) => classifyDevice(device) === "lock");

  const switches = extractSwitches(controls);
  const onCount = switches.filter(({ status }) => status.value === true).length;
  const attention = pinnedDevices.some(needsAttention);

  const openMain = async () => {
    try {
      await launchCommand({ name: "index", type: LaunchType.UserInitiated });
    } catch (error) {
      await showHUD(describeError(error));
    }
  };

  const toggle = async (device: Device, status: FunctionItem) => {
    const next = !status.value;
    const label = `${cleanName(device.name)} ${next ? "on" : "off"}`;

    try {
      await mutate(controlDevice(device, { ...status, value: next }), {
        // Tuya's device list lags behind a command, so the menu reflects the change
        // immediately and rolls back if the command actually failed.
        optimisticUpdate: (current) => ({
          ...current,
          devices: (current?.devices ?? []).map((item) =>
            item.id === device.id
              ? {
                  ...item,
                  status: (item.status ?? []).map((s) => (s.code === status.code ? { ...s, value: next } : s)),
                }
              : item,
          ),
        }),
        rollbackOnError: true,
        shouldRevalidateAfter: false,
      });
      await showHUD(`Turned ${label}`);
    } catch (error) {
      await showHUD(describeError(error));
    }
  };

  const readOnlyItem = (device: Device, icon: Icon) => (
    <MenuBarExtra.Item
      key={device.id}
      title={cleanName(device.name)}
      subtitle={statusLine(device)}
      tooltip={statusLine(device)}
      icon={{
        source: needsAttention(device) ? Icon.Warning : icon,
        tintColor: needsAttention(device) ? Color.Orange : device.online ? Color.Blue : Color.SecondaryText,
      }}
      onAction={openMain}
    />
  );

  return (
    <MenuBarExtra
      icon={{
        source: attention ? Icon.Warning : Icon.LightBulb,
        tintColor: attention ? Color.Orange : onCount > 0 ? Color.Yellow : Color.SecondaryText,
      }}
      isLoading={isLoading}
      tooltip="Tuya Smart"
      title={switches.length > 0 ? `${onCount}/${switches.length}` : undefined}
    >
      {switches.length > 0 && (
        <MenuBarExtra.Section title="Switches">
          {switches.map(({ device, status }) => (
            <MenuBarExtra.Item
              key={switchKey(device.id, status.code)}
              title={cleanName(device.name)}
              subtitle={
                device.online
                  ? (device.status ?? []).filter(isSwitchStatus).length > 1
                    ? (cachedNameFor(device.id, status.code) ?? status.name ?? status.code)
                    : status.value
                      ? "On"
                      : "Off"
                  : "Offline"
              }
              icon={{
                source: status.value ? Icon.CircleFilled : Icon.Circle,
                tintColor: !device.online ? Color.SecondaryText : status.value ? Color.Green : Color.Red,
              }}
              onAction={() => toggle(device, status)}
            />
          ))}
        </MenuBarExtra.Section>
      )}

      {sensors.length > 0 && (
        <MenuBarExtra.Section title="Sensors">
          {sensors.map((device) => readOnlyItem(device, Icon.Eye))}
        </MenuBarExtra.Section>
      )}

      {locks.length > 0 && (
        <MenuBarExtra.Section title="Locks">
          {locks.map((device) => readOnlyItem(device, Icon.Lock))}
        </MenuBarExtra.Section>
      )}

      {pinnedDevices.length === 0 && (
        <MenuBarExtra.Section title="No Pinned Devices">
          <MenuBarExtra.Item title="Pin a Device in Tuya Smart" icon={Icon.Pin} onAction={openMain} />
        </MenuBarExtra.Section>
      )}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Refresh"
          icon={Icon.ArrowClockwise}
          onAction={async () => {
            revalidate();
            await showHUD("Refreshing Tuya devices");
          }}
        />
        <MenuBarExtra.Item title="Open Tuya Smart" icon={Icon.AppWindow} onAction={openMain} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
