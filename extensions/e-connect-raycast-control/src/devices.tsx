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

import {
  fetchDashboardDevices,
  getWebUiBaseUrl,
  sendDeviceCommand,
} from "./econnect";
import type {
  DeviceConfig,
  DeviceStatePin,
  DeviceStateSnapshot,
  PinConfig,
} from "./types";
import { ConnectionErrorView } from "./ui";

const DEVICE_POLL_INTERVAL_MS = 5000;

function getStatePins(state: DeviceStateSnapshot | null | undefined) {
  return Array.isArray(state?.pins) ? state.pins : [];
}

function getStatePin(
  state: DeviceStateSnapshot | null | undefined,
  gpioPin?: number | null,
): DeviceStatePin | null {
  if (!state) {
    return null;
  }

  if (typeof gpioPin === "number") {
    const matched = getStatePins(state).find((pin) => pin.pin === gpioPin);
    if (matched) {
      return matched;
    }
  }

  if (
    typeof state.pin === "number" &&
    (gpioPin == null || gpioPin === state.pin)
  ) {
    return {
      pin: state.pin,
      value: state.value,
      brightness: state.brightness,
      temperature: state.temperature,
      humidity: state.humidity,
      restore_value: state.restore_value,
      restore_brightness: state.restore_brightness,
      trend: state.trend,
      unit: state.unit,
    };
  }

  return gpioPin == null ? (getStatePins(state)[0] ?? null) : null;
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

function getBinaryState(
  state: DeviceStateSnapshot | null | undefined,
  gpioPin?: number | null,
) {
  const pinState = getStatePin(state, gpioPin);
  const numericValue = getNumericStateValue(pinState?.value);

  if (numericValue !== null) {
    return numericValue !== 0;
  }

  return typeof pinState?.brightness === "number"
    ? pinState.brightness > 0
    : false;
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
  return (
    device.pin_configurations.find(
      (pin) => pin.mode === "OUTPUT" || pin.mode === "PWM",
    ) ?? null
  );
}

function getPowerPayload(
  device: DeviceConfig,
  pin: PinConfig | null,
  turnOn: boolean,
) {
  const pinState = pin
    ? getStatePin(device.last_state, pin.gpio_pin)
    : device.last_state;
  let targetValue: number | boolean = turnOn ? 1 : 0;

  if (
    turnOn &&
    pinState?.restore_value !== undefined &&
    pinState.restore_value !== null
  ) {
    if (
      (typeof pinState.restore_value === "number" &&
        pinState.restore_value !== 0) ||
      (typeof pinState.restore_value === "boolean" && pinState.restore_value)
    ) {
      targetValue = pinState.restore_value;
    }
  }

  const payload: Record<string, unknown> = {
    kind: "action",
    value: targetValue,
  };

  if (pin) {
    payload.pin = pin.gpio_pin;
  }

  if ((pin?.mode === "PWM" || !pin) && turnOn) {
    const min =
      typeof pin?.extra_params?.min_value === "number"
        ? pin.extra_params.min_value
        : 0;
    const max =
      typeof pin?.extra_params?.max_value === "number"
        ? pin.extra_params.max_value
        : 255;
    const fallback = Math.max(min, max);
    const current = getBrightnessState(
      device.last_state,
      pin?.gpio_pin,
      fallback,
    );
    payload.brightness = current > 0 ? current : fallback;
  }

  return payload;
}

function getBrightnessPayload(pin: PinConfig | null, percent: number) {
  const rawMin =
    typeof pin?.extra_params?.min_value === "number"
      ? pin.extra_params.min_value
      : 0;
  const rawMax =
    typeof pin?.extra_params?.max_value === "number"
      ? pin.extra_params.max_value
      : 255;
  const rangeMin = Math.min(rawMin, rawMax);
  const rangeMax = Math.max(rawMin, rawMax);
  const brightness = Math.round(
    rangeMin + ((rangeMax - rangeMin) * percent) / 100,
  );

  const payload: Record<string, unknown> = {
    kind: "action",
    brightness,
  };

  if (pin) {
    payload.pin = pin.gpio_pin;
  }

  return payload;
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
  const type =
    device.device_type?.toLowerCase() || device.type?.toLowerCase() || "";

  let label = "PWM";
  if (type === "light") label = "Brightness";
  else if (type === "fan") label = "Speed";
  else if (type === "custom") label = "Value";

  const calculatePercentage = (rawBrightness: number) => {
    const min =
      typeof pin?.extra_params?.min_value === "number"
        ? pin.extra_params.min_value
        : 0;
    const max =
      typeof pin?.extra_params?.max_value === "number"
        ? pin.extra_params.max_value
        : 255;
    const rangeMin = Math.min(min, max);
    const rangeMax = Math.max(min, max);
    return rangeMax > rangeMin
      ? Math.round(((rawBrightness - rangeMin) / (rangeMax - rangeMin)) * 100)
      : 100;
  };

  if (!pin) {
    if (
      (type === "light" || type === "fan" || type === "custom") &&
      device.last_state?.brightness !== undefined
    ) {
      const isOn = getBinaryState(device.last_state, null);
      if (!isOn) return "Off";
      return `${label} ${calculatePercentage(device.last_state.brightness)}%`;
    }
    return device.provider
      ? `External ${device.provider}`
      : "Read-only from Raycast";
  }

  const isOn = getBinaryState(device.last_state, pin.gpio_pin);

  if (pin.mode === "OUTPUT") {
    if (
      (type === "light" || type === "fan" || type === "custom") &&
      isOn &&
      device.last_state?.brightness !== undefined
    ) {
      return `On, ${label} ${calculatePercentage(device.last_state.brightness)}%`;
    }
    return isOn ? "Power on" : "Power off";
  }

  const min =
    typeof pin.extra_params?.min_value === "number"
      ? pin.extra_params.min_value
      : 0;
  const max =
    typeof pin.extra_params?.max_value === "number"
      ? pin.extra_params.max_value
      : 255;
  const brightness = getBrightnessState(
    device.last_state,
    pin.gpio_pin,
    Math.max(min, max),
  );

  if (brightness > 0) {
    if (
      type === "light" ||
      type === "fan" ||
      type === "custom" ||
      pin.mode === "PWM"
    ) {
      return `${label} ${calculatePercentage(brightness)}%`;
    }
    return `On, PWM ${brightness}`;
  }

  return "Off";
}

function getStatusColor(device: DeviceConfig) {
  if (device.auth_status !== "approved") {
    return Color.Yellow;
  }
  if (device.conn_status !== "online") {
    return Color.Red;
  }
  const primaryPin = getPrimaryControllablePin(device);
  if (primaryPin) {
    const isOn = getBinaryState(device.last_state, primaryPin.gpio_pin);
    if (!isOn) {
      return Color.Yellow;
    }
  }
  return Color.Green;
}

function getDeviceIcon(device: DeviceConfig) {
  const type =
    device.device_type?.toLowerCase() || device.type?.toLowerCase() || "";
  if (type === "custom") {
    return Icon.ComputerChip;
  }
  if (type === "light") {
    return Icon.LightBulb;
  }
  if (type === "fan") {
    return Icon.Wind;
  }
  return Icon.Circle;
}

export default function Command() {
  const [devices, setDevices] = useState<DeviceConfig[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const hasLoadedOnceRef = useRef(false);
  const isMountedRef = useRef(true);
  const loadInFlightRef = useRef<Promise<void> | null>(null);

  const load = useCallback(
    async ({ background = false }: { background?: boolean } = {}) => {
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
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load devices.",
          );
        } finally {
          loadInFlightRef.current = null;
          if (isMountedRef.current && shouldShowLoading) {
            setIsLoading(false);
          }
        }
      })();

      loadInFlightRef.current = request;
      await request;
    },
    [],
  );

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

  const onlineDevices = approvedDevices.filter(
    (device) => device.conn_status === "online",
  );
  const offlineDevices = approvedDevices.filter(
    (device) => device.conn_status !== "online",
  );
  const pendingDevices = devices.filter(
    (device) => device.auth_status !== "approved",
  );

  const runCommand = useCallback(
    async (
      device: DeviceConfig,
      payload: Record<string, unknown>,
      title: string,
    ) => {
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
          toast.message =
            response.message ??
            `The server rejected the command for ${device.name}.`;
          return;
        }

        toast.style = Toast.Style.Success;
        toast.title = "Command queued";
        toast.message =
          response.message ??
          `The server accepted the command for ${device.name}.`;
        await load();
      } catch (commandError) {
        toast.style = Toast.Style.Failure;
        toast.title = "Command failed";
        toast.message =
          commandError instanceof Error
            ? commandError.message
            : "The request did not complete.";
      }
    },
    [load],
  );

  if (error && devices.length === 0) {
    return (
      <ConnectionErrorView title="Unable to load devices" message={error} />
    );
  }

  const webUiBaseUrl = getWebUiBaseUrl();

  const renderDeviceItem = (device: DeviceConfig) => {
    const primaryPin = getPrimaryControllablePin(device);
    const canControl = device.conn_status === "online" && primaryPin !== null;
    const isOn = primaryPin
      ? getBinaryState(device.last_state, primaryPin.gpio_pin)
      : false;
    const deviceUrl = `${webUiBaseUrl}/devices/${encodeURIComponent(device.device_id)}`;

    const type =
      device.device_type?.toLowerCase() || device.type?.toLowerCase() || "";
    let pwmLabel = "Brightness";
    let pwmIcon = Icon.Sun;
    if (type === "fan") {
      pwmLabel = "Speed";
      pwmIcon = Icon.Wind;
    } else if (type === "custom") {
      pwmLabel = "Value";
      pwmIcon = Icon.ComputerChip;
    } else if (type !== "light") {
      pwmLabel = "PWM";
    }

    return (
      <List.Item
        key={device.device_id}
        title={device.name}
        subtitle={
          device.room_name?.trim() ? device.room_name : device.device_id
        }
        icon={{
          source: getDeviceIcon(device),
          tintColor: getStatusColor(device),
        }}
        accessories={[
          { text: getDeviceSummary(device) },
          { text: formatLastSeen(device.last_seen) },
        ]}
        actions={
          <ActionPanel>
            {canControl &&
            (primaryPin ||
              type === "light" ||
              type === "fan" ||
              type === "custom") ? (
              <Action
                title={isOn ? "Turn Off" : "Turn On"}
                icon={isOn ? Icon.Power : Icon.Bolt}
                onAction={() =>
                  runCommand(
                    device,
                    getPowerPayload(device, primaryPin, !isOn),
                    isOn ? "Turning device off" : "Turning device on",
                  )
                }
              />
            ) : null}
            {canControl &&
            (primaryPin?.mode === "PWM" ||
              type === "light" ||
              type === "fan" ||
              type === "custom") ? (
              <ActionPanel.Submenu title={`Set ${pwmLabel}`} icon={pwmIcon}>
                {[25, 50, 75, 100].map((percent) => (
                  <Action
                    key={percent}
                    title={`${percent}%`}
                    onAction={() =>
                      runCommand(
                        device,
                        getBrightnessPayload(primaryPin, percent),
                        `Setting ${pwmLabel.toLowerCase()} to ${percent}%`,
                      )
                    }
                  />
                ))}
              </ActionPanel.Submenu>
            ) : null}
            <Action.OpenInBrowser
              title="Open Device in Web Ui"
              url={deviceUrl}
            />
            <Action.CopyToClipboard
              title="Copy Device Id"
              content={device.device_id}
            />
            <Action
              title="Refresh Devices"
              icon={Icon.ArrowClockwise}
              onAction={load}
            />
            <Action
              title="Open Extension Preferences"
              icon={Icon.Gear}
              onAction={openExtensionPreferences}
            />
          </ActionPanel>
        }
      />
    );
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search E-Connect devices">
      {onlineDevices.length > 0 ? (
        <List.Section title="Online">
          {onlineDevices.map(renderDeviceItem)}
        </List.Section>
      ) : null}
      {offlineDevices.length > 0 ? (
        <List.Section title="Offline">
          {offlineDevices.map(renderDeviceItem)}
        </List.Section>
      ) : null}
      {pendingDevices.length > 0 ? (
        <List.Section title="Pending">
          {pendingDevices.map(renderDeviceItem)}
        </List.Section>
      ) : null}
    </List>
  );
}
