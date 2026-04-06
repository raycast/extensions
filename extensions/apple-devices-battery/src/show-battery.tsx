import {
  Action,
  ActionPanel,
  Color,
  Icon,
  Image,
  List,
  getPreferenceValues,
  open,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BluetoothDevice,
  MacBattery,
  formatTemperature,
  formatTime,
  formatWatts,
  getAllDevices,
  getChargingStatusLabel,
  getConditionLabel,
  getDeviceIcon,
  hasAirPodsComponents,
} from "./battery";
import {
  DEVICE_ICONS,
  DeviceIconId,
  getIconAsset,
  invalidateCache,
  loadIconOverrides,
  removeIconOverride,
  setIconOverride,
} from "./device-icons";

function getMacIcon(mac: MacBattery): { source: Icon; tintColor?: Color } {
  if (mac.isCharging) {
    return { source: Icon.BatteryCharging, tintColor: Color.Blue };
  }
  if (mac.isFullyCharged || mac.chargingStatus === "on hold") {
    return { source: Icon.BatteryCharging, tintColor: Color.Green };
  }
  if (mac.percentage <= 10)
    return { source: Icon.Battery, tintColor: Color.Red };
  if (mac.percentage <= 20)
    return { source: Icon.Battery, tintColor: Color.Orange };
  return { source: Icon.Battery, tintColor: Color.Green };
}

function getDefaultIconId(type: string): DeviceIconId {
  switch (type) {
    case "headphones":
      return "headphones";
    case "iphone":
      return "iphone";
    case "ipad":
      return "ipad";
    case "watch":
      return "apple-watch";
    case "mouse":
      return "mouse";
    case "keyboard":
      return "keyboard";
    default:
      return "bluetooth";
  }
}

function buildMacAccessories(mac: MacBattery): string[] {
  const accessories: string[] = [];
  if (mac.isConnected) {
    accessories.push(getChargingStatusLabel(mac.chargingStatus));
  } else {
    const time = formatTime(mac.hoursRemaining, mac.minutesRemaining);
    if (time !== "--:--") accessories.push(time);
    accessories.push(getChargingStatusLabel(mac.chargingStatus));
  }
  return accessories;
}

function formatSimpleBattery(device: BluetoothDevice): string {
  if (device.batteryLevel !== null) return `${device.batteryLevel}%`;
  if (device.batteryLeft !== null && device.batteryRight !== null) {
    return `L: ${device.batteryLeft}%  R: ${device.batteryRight}%`;
  }
  return "";
}

interface DeviceRow {
  key: string;
  deviceAddress: string;
  iconAsset: string;
  title: string;
  subtitle: string;
  copyText: string;
}

function expandDeviceRows(
  device: BluetoothDevice,
  overrides: Record<string, DeviceIconId>,
): DeviceRow[] {
  const iconType = getDeviceIcon(device);

  if (hasAirPodsComponents(device)) {
    const earbudsSubtitle =
      device.batteryLeft !== null && device.batteryRight !== null
        ? `L: ${device.batteryLeft}%  R: ${device.batteryRight}%`
        : "";
    const caseSubtitle =
      device.batteryCase !== null ? `${device.batteryCase}%` : "";

    const earbudsKey = `${device.address}-earbuds`;
    const caseKey = `${device.address}-case`;

    const earbudsIconId = overrides[earbudsKey] ?? getDefaultIconId(iconType);
    const caseIconId = overrides[caseKey] ?? "airpods-case";

    return [
      {
        key: earbudsKey,
        deviceAddress: earbudsKey,
        iconAsset: getIconAsset(earbudsIconId),
        title: device.name,
        subtitle: earbudsSubtitle,
        copyText: `${device.name}: ${earbudsSubtitle}`,
      },
      {
        key: caseKey,
        deviceAddress: caseKey,
        iconAsset: getIconAsset(caseIconId),
        title: `${device.name} Case`,
        subtitle: caseSubtitle,
        copyText: `${device.name} Case: ${caseSubtitle}`,
      },
    ];
  }

  const overrideId = overrides[device.address];
  const resolvedIconId = overrideId ?? getDefaultIconId(iconType);

  return [
    {
      key: device.address,
      deviceAddress: device.address,
      iconAsset: getIconAsset(resolvedIconId),
      title: device.name,
      subtitle: formatSimpleBattery(device),
      copyText: `${device.name}: ${formatSimpleBattery(device)}`,
    },
  ];
}

function useAutoRefresh(revalidate: () => void, intervalMs: number) {
  const ref = useRef(revalidate);
  ref.current = revalidate;
  useEffect(() => {
    const id = setInterval(() => ref.current(), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
}

export default function ShowBattery() {
  const preferences = getPreferenceValues<Preferences>();
  const { data, isLoading, revalidate } = useCachedPromise(getAllDevices, [], {
    keepPreviousData: true,
  });
  useAutoRefresh(revalidate, 1000);

  const [iconOverrides, setIconOverrides] = useState<
    Record<string, DeviceIconId>
  >({});

  useEffect(() => {
    loadIconOverrides().then(setIconOverrides);
  }, []);

  const handleSetIcon = useCallback(
    async (deviceAddress: string, iconId: DeviceIconId) => {
      await setIconOverride(deviceAddress, iconId);
      invalidateCache();
      const updated = await loadIconOverrides();
      setIconOverrides(updated);
    },
    [],
  );

  const handleResetIcon = useCallback(async (deviceAddress: string) => {
    await removeIconOverride(deviceAddress);
    invalidateCache();
    const updated = await loadIconOverrides();
    setIconOverrides(updated);
  }, []);

  const openSettings = () =>
    open("x-apple.systempreferences:com.apple.preference.battery");

  const deviceRows =
    data?.bluetooth.flatMap((d) => expandDeviceRows(d, iconOverrides)) ?? [];

  return (
    <List isLoading={isLoading}>
      {data ? (
        <>
          <List.Section title="This Mac">
            <List.Item
              icon={getMacIcon(data.mac)}
              title={data.mac.name}
              subtitle={`${data.mac.percentage}%`}
              accessories={buildMacAccessories(data.mac).map((text) => ({
                text,
              }))}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View Details"
                    icon={Icon.Sidebar}
                    target={
                      <MacDetailView
                        mac={data.mac}
                        tempUnit={preferences.temperatureUnit}
                      />
                    }
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={revalidate}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                  <Action
                    title="Open Battery Settings"
                    icon={Icon.Gear}
                    onAction={openSettings}
                  />
                  <Action.CopyToClipboard
                    title="Copy Battery %"
                    content={`${data.mac.percentage}%`}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                </ActionPanel>
              }
            />
          </List.Section>

          {deviceRows.length > 0 ? (
            <List.Section title="Devices">
              {deviceRows.map((row) => (
                <List.Item
                  key={row.key}
                  icon={{
                    source: row.iconAsset,
                    mask: Image.Mask.RoundedRectangle,
                  }}
                  title={row.title}
                  subtitle={row.subtitle}
                  actions={
                    <ActionPanel>
                      <Action.Push
                        title="Change Icon"
                        icon={Icon.Image}
                        target={
                          <IconPickerView
                            deviceAddress={row.deviceAddress}
                            deviceName={row.title}
                            onSelect={handleSetIcon}
                            onReset={handleResetIcon}
                          />
                        }
                      />
                      <Action
                        title="Refresh"
                        icon={Icon.ArrowClockwise}
                        onAction={revalidate}
                        shortcut={{ modifiers: ["cmd"], key: "r" }}
                      />
                      <Action.CopyToClipboard
                        title="Copy Battery Info"
                        content={row.copyText}
                        shortcut={{ modifiers: ["cmd"], key: "c" }}
                      />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          ) : null}
        </>
      ) : null}
    </List>
  );
}

function IconPickerView({
  deviceAddress,
  deviceName,
  onSelect,
  onReset,
}: {
  deviceAddress: string;
  deviceName: string;
  onSelect: (address: string, iconId: DeviceIconId) => Promise<void>;
  onReset: (address: string) => Promise<void>;
}) {
  const { pop } = useNavigation();
  return (
    <List navigationTitle={`Choose Icon for ${deviceName}`}>
      <List.Section title="Available Icons">
        {DEVICE_ICONS.map((entry) => (
          <List.Item
            key={entry.id}
            icon={{
              source: entry.asset,
              mask: Image.Mask.RoundedRectangle,
            }}
            title={entry.label}
            actions={
              <ActionPanel>
                <Action
                  title="Select Icon"
                  icon={Icon.Checkmark}
                  onAction={async () => {
                    await onSelect(deviceAddress, entry.id);
                    pop();
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Reset">
        <List.Item
          icon={Icon.XMarkCircle}
          title="Reset to Default"
          actions={
            <ActionPanel>
              <Action
                title="Reset Icon"
                icon={Icon.XMarkCircle}
                onAction={async () => {
                  await onReset(deviceAddress);
                  pop();
                }}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

function MacDetailView({
  mac,
  tempUnit,
}: {
  mac: MacBattery;
  tempUnit: string;
}) {
  return (
    <List navigationTitle={`${mac.name} Battery`}>
      <List.Section title="Charge">
        <List.Item
          icon={Icon.Battery}
          title="Battery Level"
          accessories={[{ text: `${mac.percentage}%` }]}
        />
        <List.Item
          icon={Icon.Bolt}
          title="Status"
          accessories={[{ text: getChargingStatusLabel(mac.chargingStatus) }]}
        />
        <List.Item
          icon={Icon.Clock}
          title={
            mac.chargingStatus === "charging"
              ? "Time Until Full"
              : "Time Remaining"
          }
          accessories={[
            { text: formatTime(mac.hoursRemaining, mac.minutesRemaining) },
          ]}
        />
        <List.Item
          icon={Icon.Bolt}
          title="Power"
          accessories={[{ text: formatWatts(mac.watts) }]}
        />
        <List.Item
          icon={mac.isLowPowerMode ? Icon.BoltDisabled : Icon.Bolt}
          title="Low Power Mode"
          accessories={[{ text: mac.isLowPowerMode ? "On" : "Off" }]}
        />
      </List.Section>

      <List.Section title="Health">
        <List.Item
          icon={Icon.Heart}
          title="Battery Health"
          accessories={[
            {
              text: `${mac.health.toFixed(1)}% (${getConditionLabel(mac.health)})`,
            },
          ]}
        />
        <List.Item
          icon={Icon.RotateAntiClockwise}
          title="Cycle Count"
          accessories={[{ text: `${mac.cycleCount}` }]}
        />
        <List.Item
          icon={Icon.Temperature}
          title="Temperature"
          accessories={[{ text: formatTemperature(mac.temperature, tempUnit) }]}
        />
      </List.Section>

      <List.Section title="Capacity">
        <List.Item
          icon={Icon.BarChart}
          title="Current Charge"
          accessories={[
            { text: `${mac.currentCharge} / ${mac.maxCapacity} mAh` },
          ]}
        />
        <List.Item
          icon={Icon.BarChart}
          title="Design Capacity"
          accessories={[{ text: `${mac.designCapacity} mAh` }]}
        />
        <List.Item
          icon={Icon.Bolt}
          title="Voltage"
          accessories={[{ text: `${(mac.voltage / 1000).toFixed(2)} V` }]}
        />
      </List.Section>

      {mac.isConnected && mac.adapterName ? (
        <List.Section title="Power Source">
          <List.Item
            icon={Icon.Plug}
            title="Adapter"
            accessories={[
              {
                text: `${mac.adapterName}${mac.adapterWatts ? ` (${mac.adapterWatts}W)` : ""}`,
              },
            ]}
          />
        </List.Section>
      ) : null}

      {mac.serial ? (
        <List.Section title="Info">
          <List.Item title="Serial" accessories={[{ text: mac.serial }]} />
        </List.Section>
      ) : null}
    </List>
  );
}
