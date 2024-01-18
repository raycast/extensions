import { Icon, MenuBarExtra, getPreferenceValues, open, Color } from "@raycast/api";
import { useCachedState, useCachedPromise } from "@raycast/utils";

import { Battery, getBattery } from "./devices/workstation";
import { getBluetoothDevices, Device } from "./devices/external";

const cacheKey = "batteries-included-1";

const useBatteriesIncluded = () => {
  const [batt, setBatt] = useCachedState<{
    prev: Battery | null;
    next: Battery;
    latest: Battery;
  } | null>(cacheKey + "-batt", null);

  const [devices, setDevices] = useCachedState<{
    prev: Device[] | null;
    next: Device[];
    latest: Device[];
  } | null>(cacheKey + "-devices", null);

  const { isLoading: battLoading } = useCachedPromise(getBattery, [], {
    onData(data) {
      const batteryState = { ...data };
      if (!batt || (batt.prev && batt.prev.time < Date.now() - 5 * 60 * 1000)) {
        console.log("Resetting battery state", batteryState);
        setBatt({ prev: null, next: batteryState, latest: batteryState });
      } else if (batt.next.time < Date.now() - 60 * 1000 || batt.next.watts !== data.watts) {
        console.log("Storing next battery state", batteryState);
        setBatt({ prev: batt.next, next: batteryState, latest: batteryState });
      } else {
        console.log("Storing latest battery state", batteryState);
        setBatt({ prev: batt.prev, next: batt.next, latest: batteryState });
      }
    },
  });

  const { isLoading: devicecLoading } = useCachedPromise(getBluetoothDevices, [], {
    onData(data) {
      if (!devices || devices.prev == null) {
        setDevices({ prev: null, next: data, latest: data });
      } else if (devices.next.length !== data.length) {
        setDevices({ prev: devices.next, next: data, latest: data });
      } else {
        // check if any of the devices have the avg battery level changed
        const changed = devices.next.some((device, index) => {
          return device.batteryLevels?.avg !== data[index].batteryLevels?.avg;
        });
        if (changed) {
          setDevices({ prev: devices.prev, next: devices.next, latest: data });
        }
      }
    },
  });

  const isLoading = battLoading && devicecLoading;
  return { isLoading, devices, batt };
};

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const { isLoading, devices, batt } = useBatteriesIncluded();

  const openBatterySettings = () => {
    open("x-apple.systempreferences:com.apple.preference.battery");
  };

  const openBluetoothSettings = () => {
    open("x-apple.systempreferences:com.apple.settings.bluetooth");
  };

  const getExternalSubtitle = (device: Device): MenuBarExtra.Item.Props["subtitle"] => {
    const med = device?.batteryLevels?.avg ?? 0;
    const rounded = Math.round(med * 100);
    return rounded + "%";
  };
  const getExternalIcon = (device: Device): MenuBarExtra.Item.Props["icon"] => {
    const med = device?.batteryLevels?.avg ?? 0;
    const color = med < 0.4 ? Color.Red : med < 0.5 ? Color.Orange : med < 0.6 ? Color.Yellow : undefined;

    return {
      source: device.icon?.source ?? Icon.Bluetooth,
      tintColor: color,
    };
  };

  const wattDiff =
    batt?.prev?.watts && batt.latest.watts && batt.prev.charging === batt.latest.charging
      ? Math.round((batt.latest.watts - batt.prev.watts) * 10) / 10
      : null;

  const timeRemaining =
    batt && batt.latest.hoursRemaining != null
      ? `${batt.latest.hoursRemaining}:${String(batt.latest.minutesRemaining).padStart(2, "0")}`
      : null;

  const batteryColor = !batt
    ? undefined
    : batt.latest.charging
      ? Color.Blue
      : batt.latest.capacity < 0.1
        ? Color.Red
        : batt.latest.capacity < 0.2
          ? Color.Orange
          : batt.latest.capacity < 0.3
            ? Color.Yellow
            : undefined;

  const remainingColor =
    !batt || batt.latest.charging
      ? undefined
      : batt.latest.timeRemaining == null
        ? Color.SecondaryText
        : batt.latest.timeRemaining < (Number(preferences.remainingRed) || 0) * 60
          ? Color.Red
          : batt.latest.timeRemaining < (Number(preferences.remainingOrange) || 0) * 60
            ? Color.Orange
            : batt.latest.timeRemaining < (Number(preferences.remainingYellow) || 0) * 60
              ? Color.Yellow
              : undefined;

  const powerColor =
    !batt || batt.latest.charging || !batt.latest.watts
      ? undefined
      : -batt.latest.watts > (Number(preferences.highPowerUsage) || 500)
        ? Color.Yellow
        : undefined;

  const iconColor = !batt
    ? Color.SecondaryText
    : batt.latest.charging && batt.latest.capacity == 1
      ? undefined
      : batt.latest.charging
        ? Color.Blue
        : remainingColor
          ? remainingColor
          : powerColor
            ? powerColor
            : undefined;

  const battPct = batt ? Math.round(batt?.latest.capacity * 100) : null;

  return (
    <MenuBarExtra
      icon={{
        source:
          battPct == null
            ? Icon.Battery
            : battPct == 100
              ? Icon.BatteryCharging
              : // @ts-expect-error Yep, this is a hack
                Icon[`Number${String(battPct).padStart(2, "0")}`],
        tintColor: iconColor,
      }}
      isLoading={isLoading}
    >
      <MenuBarExtra.Section title="Workstation">
        {batt?.latest ? (
          <>
            <MenuBarExtra.Item
              icon={{
                source: batt.latest.connected ? Icon.BatteryCharging : Icon.Battery,
                tintColor: batteryColor,
              }}
              subtitle={batt.latest.charging ? "Charging" : "Discharging"}
              title={`${Math.round(batt.latest.capacity * 100)}%`}
              onAction={openBatterySettings}
            />
            <MenuBarExtra.Item
              icon={{ source: Icon.Clock, tintColor: remainingColor }}
              title={timeRemaining || "--:--"}
              subtitle={batt.latest.charging ? "Time until charged" : "Time remaining"}
              onAction={openBatterySettings}
            />
            <MenuBarExtra.Item
              icon={{ source: Icon.Check, tintColor: iconColor }}
              title={batt.latest.health.toFixed(2) + "%"}
              subtitle={"Battery health"}
              onAction={openBatterySettings}
            />
            <MenuBarExtra.Item
              icon={{ source: Icon.RotateAntiClockwise, tintColor: iconColor }}
              title={batt.latest.cycles.toFixed(0)}
              subtitle={"Battery cycles"}
              onAction={openBatterySettings}
            />
            <MenuBarExtra.Item
              icon={{
                source: Icon.Bolt,
                tintColor: powerColor,
              }}
              title={batt.latest.watts ? `${Math.round(Math.abs(batt.latest.watts))}W` : "--"}
              subtitle={batt.latest.charging ? "Power input (~1 min)" : "Power draw (~1 min)"}
              onAction={openBatterySettings}
            />

            {!batt.latest.charging && wattDiff ? (
              <MenuBarExtra.Item
                icon={{
                  source: wattDiff > 0 ? Icon.Minus : wattDiff < 0 ? Icon.Plus : Icon.Dot,
                  tintColor: wattDiff > 0 ? Color.Green : wattDiff < 0 ? Color.Red : undefined,
                }}
                title={wattDiff != null ? `${Math.abs(wattDiff)}W` : "-"}
                subtitle={
                  wattDiff > 0 ? "Lower draw (~1 min)" : wattDiff < 0 ? "Higher draw (~1 min)" : "No difference"
                }
                tooltip="Change in power draw since last update"
                onAction={openBatterySettings}
              />
            ) : null}
          </>
        ) : null}
      </MenuBarExtra.Section>
      {devices?.latest && devices.latest.length > 0 && (
        <>
          <MenuBarExtra.Section title="External">
            {devices.latest.map((device) => (
              <MenuBarExtra.Item
                key={device.macAddress}
                icon={getExternalIcon(device)}
                title={device.name ? device.name : device.macAddress}
                subtitle={getExternalSubtitle(device)}
                onAction={openBluetoothSettings}
              />
            ))}
          </MenuBarExtra.Section>
        </>
      )}
    </MenuBarExtra>
  );
}
