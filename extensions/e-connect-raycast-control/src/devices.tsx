import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  Toast,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { fetchDashboardDevices, getWebUiBaseUrl, sendDeviceCommand } from "./econnect";
import type { DeviceConfig, DeviceStatePin, DeviceStateSnapshot, PinConfig } from "./types";
import { ConnectionErrorView } from "./ui";

const DEVICE_POLL_INTERVAL_MS = 5000;

function getStatePins(state: DeviceStateSnapshot | null | undefined) {
  return Array.isArray(state?.pins) ? state.pins : [];
}

function getStatePin(state: DeviceStateSnapshot | null | undefined, gpioPin?: number | null): DeviceStatePin | null {
  if (!state) {
    return null;
  }

  if (typeof gpioPin === "number") {
    const matched = getStatePins(state).find((pin) => pin.pin === gpioPin);
    if (matched) {
      return matched;
    }
  }

  if (typeof state.pin === "number" && (gpioPin == null || gpioPin === state.pin)) {
    return {
      pin: state.pin,
      value: state.value,
      brightness: state.brightness,
      temperature: state.temperature,
      humidity: state.humidity,
      trend: state.trend,
      unit: state.unit,
    };
  }

  return gpioPin == null ? getStatePins(state)[0] ?? null : null;
}

function getNumericStateValue(value: number | boolean | undefined) {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }
  return null;
}

function getBinaryState(state: DeviceStateSnapshot | null | undefined, gpioPin?: number | null) {
  const pinState = getStatePin(state, gpioPin);
  const numericValue = getNumericStateValue(pinState?.value);

  if (numericValue !== null) {
    return numericValue !== 0;
  }

  return typeof pinState?.brightness === "number" ? pinState.brightness > 0 : false;
}

function getBrightnessState(
  state: DeviceStateSnapshot | null | undefined,
  gpioPin: number | null | undefined,
  fallback: number,
) {
  const pinState = getStatePin(state, gpioPin);
  const numericValue = getNumericStateValue(pinState?.value);

  if (typeof pinState?.brightness === "number") {
    return pinState.brightness;
  }
  if (numericValue !== null) {
    return numericValue;
  }

  return fallback;
}

function getPrimaryControllablePin(device: DeviceConfig) {
  return device.pin_configurations.find((pin) => pin.mode === "OUTPUT" || pin.mode === "PWM") ?? null;
}

function getPowerPayload(device: DeviceConfig, pin: PinConfig, turnOn: boolean) {
  const payload: Record<string, unknown> = {
    kind: "action",
    pin: pin.gpio_pin,
    value: turnOn ? 1 : 0,
  };

  if (pin.mode === "PWM" && turnOn) {
    const min = typeof pin.extra_params?.min_value === "number" ? pin.extra_params.min_value : 0;
    const max = typeof pin.extra_params?.max_value === "number" ? pin.extra_params.max_value : 255;
    const fallback = Math.max(min, max);
    const current = getBrightnessState(device.last_state, pin.gpio_pin, fallback);
    payload.brightness = current > 0 ? current : fallback;
  }

  return payload;
}

function getBrightnessPayload(pin: PinConfig, percent: number) {
  const rawMin = typeof pin.extra_params?.min_value === "number" ? pin.extra_params.min_value : 0;
  const rawMax = typeof pin.extra_params?.max_value === "number" ? pin.extra_params.max_value : 255;
  const rangeMin = Math.min(rawMin, rawMax);
  const rangeMax = Math.max(rawMin, rawMax);
  const brightness = Math.round(rangeMin + ((rangeMax - rangeMin) * percent) / 100);

  return {
    kind: "action",
    pin: pin.gpio_pin,
    brightness,
  };
}

function formatLastSeen(value?: string | null) {
  if (!value) {
    return "No heartbeat";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "No heartbeat";
  }

  return `Seen ${date.toLocaleString()}`;
}

function getDeviceSummary(device: DeviceConfig) {
  const pin = getPrimaryControllablePin(device);
  if (!pin) {
    return device.provider ? `External ${device.provider}` : "Read-only from Raycast";
  }

  if (pin.mode === "OUTPUT") {
    return getBinaryState(device.last_state, pin.gpio_pin) ? "Power on" : "Power off";
  }

  const min = typeof pin.extra_params?.min_value === "number" ? pin.extra_params.min_value : 0;
  const max = typeof pin.extra_params?.max_value === "number" ? pin.extra_params.max_value : 255;
  const brightness = getBrightnessState(device.last_state, pin.gpio_pin, Math.max(min, max));
  return brightness > 0 ? `On, PWM ${brightness}` : "Off";
}

function getStatusColor(device: DeviceConfig) {
  if (device.auth_status !== "approved") {
    return Color.Yellow;
  }
  return device.conn_status === "online" ? Color.Green : Color.Red;
}

export default function Command() {
  const [devices, setDevices] = useState<DeviceConfig[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const hasLoadedOnceRef = useRef(false);
  const isMountedRef = useRef(true);
  const loadInFlightRef = useRef<Promise<void> | null>(null);

  const load = useCallback(async ({ background = false }: { background?: boolean } = {}) => {
    if (loadInFlightRef.current) {
      await loadInFlightRef.current;
      return;
    }

    const shouldShowLoading = !background || !hasLoadedOnceRef.current;
    if (shouldShowLoading) {
      setIsLoading(true);
    }
    if (!background) {
      setError(null);
    }

    const request = (async () => {
      try {
        const nextDevices = await fetchDashboardDevices();
        if (!isMountedRef.current) {
          return;
        }
        setDevices(nextDevices);
        setError(null);
        hasLoadedOnceRef.current = true;
      } catch (loadError) {
        if (!isMountedRef.current) {
          return;
        }
        setError(loadError instanceof Error ? loadError.message : "Failed to load devices.");
      } finally {
        loadInFlightRef.current = null;
        if (isMountedRef.current && shouldShowLoading) {
          setIsLoading(false);
        }
      }
    })();

    loadInFlightRef.current = request;
    await request;
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    void load();

    const intervalId = setInterval(() => {
      void load({ background: true });
    }, DEVICE_POLL_INTERVAL_MS);

    return () => {
      isMountedRef.current = false;
      clearInterval(intervalId);
    };
  }, [load]);

  const approvedDevices = useMemo(
    () => devices.filter((device) => device.auth_status === "approved"),
    [devices],
  );

  const onlineDevices = approvedDevices.filter((device) => device.conn_status === "online");
  const offlineDevices = approvedDevices.filter((device) => device.conn_status !== "online");
  const pendingDevices = devices.filter((device) => device.auth_status !== "approved");

  const runCommand = useCallback(
    async (device: DeviceConfig, payload: Record<string, unknown>, title: string) => {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title,
        message: `Sending command to ${device.name}`,
      });

      try {
        const response = await sendDeviceCommand(device.device_id, payload);

        if (response.status === "failed") {
          toast.style = Toast.Style.Failure;
          toast.title = "Command failed";
          toast.message = response.message ?? `The server rejected the command for ${device.name}.`;
          return;
        }

        toast.style = Toast.Style.Success;
        toast.title = "Command queued";
        toast.message = response.message ?? `The server accepted the command for ${device.name}.`;
        await load();
      } catch (commandError) {
        toast.style = Toast.Style.Failure;
        toast.title = "Command failed";
        toast.message = commandError instanceof Error ? commandError.message : "The request did not complete.";
      }
    },
    [load],
  );

  if (error && devices.length === 0) {
    return <ConnectionErrorView title="Unable to load devices" message={error} />;
  }

  const webUiBaseUrl = getWebUiBaseUrl();

  const renderDeviceItem = (device: DeviceConfig) => {
    const primaryPin = getPrimaryControllablePin(device);
    const canControl = device.conn_status === "online" && primaryPin !== null;
    const isOn = primaryPin ? getBinaryState(device.last_state, primaryPin.gpio_pin) : false;
    const deviceUrl = `${webUiBaseUrl}/devices/${encodeURIComponent(device.device_id)}`;

    return (
      <List.Item
        key={device.device_id}
        title={device.name}
        subtitle={device.room_name?.trim() ? device.room_name : device.device_id}
        icon={{ source: Icon.Circle, tintColor: getStatusColor(device) }}
        accessories={[
          { text: getDeviceSummary(device) },
          { text: formatLastSeen(device.last_seen) },
        ]}
        actions={
          <ActionPanel>
            {canControl && primaryPin ? (
              <Action
                title={isOn ? "Turn Off" : "Turn On"}
                icon={isOn ? Icon.Power : Icon.Bolt}
                onAction={() => runCommand(device, getPowerPayload(device, primaryPin, !isOn), isOn ? "Turning device off" : "Turning device on")}
              />
            ) : null}
            {canControl && primaryPin?.mode === "PWM" ? (
              <ActionPanel.Submenu title="Set Brightness" icon={Icon.Sun}>
                {[25, 50, 75, 100].map((percent) => (
                  <Action
                    key={percent}
                    title={`${percent}%`}
                    onAction={() => runCommand(device, getBrightnessPayload(primaryPin, percent), `Setting brightness to ${percent}%`)}
                  />
                ))}
              </ActionPanel.Submenu>
            ) : null}
            <Action.OpenInBrowser title="Open Device in Web UI" url={deviceUrl} />
            <Action.CopyToClipboard title="Copy Device ID" content={device.device_id} />
            <Action title="Refresh Devices" icon={Icon.ArrowClockwise} onAction={load} />
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search E-Connect devices">
      {onlineDevices.length > 0 ? <List.Section title="Online">{onlineDevices.map(renderDeviceItem)}</List.Section> : null}
      {offlineDevices.length > 0 ? <List.Section title="Offline">{offlineDevices.map(renderDeviceItem)}</List.Section> : null}
      {pendingDevices.length > 0 ? <List.Section title="Pending">{pendingDevices.map(renderDeviceItem)}</List.Section> : null}
    </List>
  );
}
