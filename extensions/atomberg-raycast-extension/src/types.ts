export interface Device {
  device_id: string;
  name: string;
  model: string;
  series: string;
  color: string;
  room: string;
  metadata: {
    ssid: string;
  };
}

export interface Preferences {
  apiKey?: string;
  refreshToken?: string;
}

export interface AccessTokenResponse {
  status: string;
  message: {
    access_token: string;
  };
}

export interface AtombergApiResponse {
  status: string;
  message: {
    devices_list: Device[];
  };
}

export interface DeviceControlResponse {
  status: string;
  message?: string;
}

export interface DeviceState {
  device_id: string;
  is_online: boolean;
  power: boolean;
  last_recorded_speed: number;
  timer_hours: number;
  timer_time_elapsed_mins: number;
  ts_epoch_seconds: number;
  last_recorded_brightness: number;
  last_recorded_color: string;
  sleep_mode: boolean;
  led: boolean;
}

export interface DeviceStateResponse {
  status: string;
  message: {
    device_state: DeviceState[];
  };
}

export type DevicesByRoom = Record<string, Device[]>;

export type CommandParameters = Record<string, string | number | boolean>;

export type DeviceCommandType =
  | "toggle"
  | "speed_up"
  | "speed_down"
  | "sleep_mode"
  | "led_toggle"
  | "timer_1h"
  | "timer_2h"
  | "timer_3h"
  | "timer_6h"
  | "timer_off"
  | "brightness_up"
  | "brightness_down"
  | "set_speed"
  | "set_timer"
  | "set_brightness"
  | "set_brightness_delta"
  | "set_color";

export interface BaseDeviceCommand {
  command: DeviceCommandType;
}

export interface SimpleCommand extends BaseDeviceCommand {
  command:
    | "toggle"
    | "speed_up"
    | "speed_down"
    | "sleep_mode"
    | "led_toggle"
    | "timer_1h"
    | "timer_2h"
    | "timer_3h"
    | "timer_6h"
    | "timer_off"
    | "brightness_up"
    | "brightness_down";
}

export interface SpeedCommand extends BaseDeviceCommand {
  command: "set_speed";
  speed_level: number;
}

export interface TimerCommand extends BaseDeviceCommand {
  command: "set_timer";
  timer_hours: number;
}

export interface BrightnessCommand extends BaseDeviceCommand {
  command: "set_brightness";
  brightness_level: number;
}

export interface BrightnessDeltaCommand extends BaseDeviceCommand {
  command: "set_brightness_delta";
  brightness_delta: number;
}

export interface ColorCommand extends BaseDeviceCommand {
  command: "set_color";
  color: string;
}

export type DeviceCommand =
  | SimpleCommand
  | SpeedCommand
  | TimerCommand
  | BrightnessCommand
  | BrightnessDeltaCommand
  | ColorCommand;

export interface DeviceControlPayload {
  device: Device;
  command: DeviceCommand;
}

export interface DeviceCommandDefinition {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  command: DeviceCommandType;
  description: string;
  requiredCapability?: string;
  parameters?: {
    [key: string]: {
      type: "number" | "string";
      min?: number;
      max?: number;
      options?: string[];
      required: boolean;
    };
  };
}
