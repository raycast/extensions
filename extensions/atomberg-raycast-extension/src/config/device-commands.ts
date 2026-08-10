import type { DeviceCommandDefinition, DeviceCommandType, Device } from "../types";
import { hasCapability, type DeviceCapabilities } from "./device-capabilities";

/**
 * Complete list of available device commands for Atomberg devices
 *
 * Each command definition includes:
 * - id: Unique identifier for the command
 * - title: Human-readable title for UI display
 * - subtitle: Brief description of the action
 * - icon: Icon identifier for UI representation
 * - command: API command string sent to the device
 * - description: Detailed description of what the command does
 * - requiredCapability: Device capability required to use this command
 * - parameters: Optional parameters for commands that need user input
 *
 * Commands are organized by functionality:
 * - Power control (power-toggle)
 * - Speed control (speed-up, speed-down, set-speed)
 * - Sleep mode (sleep-mode)
 * - LED control (led-toggle, brightness controls, color control)
 * - Timer functions (various timer presets and custom timer)
 */
export const DEVICE_COMMANDS: DeviceCommandDefinition[] = [
  // Power control commands
  {
    id: "power-toggle",
    title: "Toggle Power",
    subtitle: "Turn device on/off",
    icon: "power",
    command: "toggle",
    description: "Toggle the power state of the device",
    requiredCapability: "power",
  },

  // Speed control commands
  {
    id: "speed-up",
    title: "Increase Speed",
    subtitle: "Increase fan speed by 1 level",
    icon: "plus",
    command: "speed_up",
    description: "Increase the fan speed by one level",
    requiredCapability: "speed",
  },
  {
    id: "speed-down",
    title: "Decrease Speed",
    subtitle: "Decrease fan speed by 1 level",
    icon: "minus",
    command: "speed_down",
    description: "Decrease the fan speed by one level",
    requiredCapability: "speed",
  },
  {
    id: "set-speed",
    title: "Set Speed Level",
    subtitle: "Set specific fan speed (1-6)",
    icon: "gauge",
    command: "set_speed",
    description: "Set the fan to a specific speed level",
    requiredCapability: "speed",
    parameters: {
      speed_level: {
        type: "number",
        min: 1,
        max: 6,
        required: true,
      },
    },
  },

  // Sleep mode command
  {
    id: "sleep-mode",
    title: "Toggle Sleep Mode",
    subtitle: "Activate/deactivate sleep mode",
    icon: "moon",
    command: "sleep_mode",
    description: "Toggle sleep mode for quieter operation",
    requiredCapability: "sleep",
  },

  // LED control commands
  {
    id: "led-toggle",
    title: "Toggle LED",
    subtitle: "Turn LED indicators on/off",
    icon: "lightbulb",
    command: "led_toggle",
    description: "Toggle the LED indicators on the device",
    requiredCapability: "led",
  },

  // Timer commands - Preset timers
  {
    id: "timer-1h",
    title: "Set 1 Hour Timer",
    subtitle: "Auto turn off after 1 hour",
    icon: "clock",
    command: "timer_1h",
    description: "Set device to automatically turn off after 1 hour",
    requiredCapability: "timer",
  },
  {
    id: "timer-2h",
    title: "Set 2 Hour Timer",
    subtitle: "Auto turn off after 2 hours",
    icon: "clock",
    command: "timer_2h",
    description: "Set device to automatically turn off after 2 hours",
    requiredCapability: "timer",
  },
  {
    id: "timer-3h",
    title: "Set 3 Hour Timer",
    subtitle: "Auto turn off after 3 hours",
    icon: "clock",
    command: "timer_3h",
    description: "Set device to automatically turn off after 3 hours",
    requiredCapability: "timer",
  },
  {
    id: "timer-6h",
    title: "Set 6 Hour Timer",
    subtitle: "Auto turn off after 6 hours",
    icon: "clock",
    command: "timer_6h",
    description: "Set device to automatically turn off after 6 hours",
    requiredCapability: "timer",
  },

  // Timer commands - Custom and control
  {
    id: "set-timer",
    title: "Set Custom Timer",
    subtitle: "Set timer for specific hours",
    icon: "timer",
    command: "set_timer",
    description: "Set device to automatically turn off after specified hours",
    requiredCapability: "timer",
    parameters: {
      timer_hours: {
        type: "number",
        min: 0,
        max: 4,
        required: true,
      },
    },
  },
  {
    id: "timer-off",
    title: "Cancel Timer",
    subtitle: "Remove any active timer",
    icon: "xmarkcircle",
    command: "timer_off",
    description: "Cancel any currently active timer",
    requiredCapability: "timer",
  },

  // Brightness control commands
  {
    id: "brightness-up",
    title: "Increase Brightness",
    subtitle: "Increase LED brightness by 10%",
    icon: "sun",
    command: "brightness_up",
    description: "Increase the LED brightness by 10%",
    requiredCapability: "brightness",
  },
  {
    id: "brightness-down",
    title: "Decrease Brightness",
    subtitle: "Decrease LED brightness by 10%",
    icon: "sun",
    command: "brightness_down",
    description: "Decrease the LED brightness by 10%",
    requiredCapability: "brightness",
  },
  {
    id: "set-brightness",
    title: "Set Brightness",
    subtitle: "Set LED brightness level (10-100)",
    icon: "sun",
    command: "set_brightness",
    description: "Set the LED brightness to a specific level",
    requiredCapability: "brightness",
    parameters: {
      brightness_level: {
        type: "number",
        min: 10,
        max: 100,
        required: true,
      },
    },
  },
  {
    id: "set-brightness-delta",
    title: "Adjust Brightness",
    subtitle: "Adjust LED brightness by specific amount",
    icon: "sun",
    command: "set_brightness_delta",
    description: "Adjust the LED brightness by a specific delta value",
    requiredCapability: "brightness",
    parameters: {
      brightness_delta: {
        type: "number",
        min: -90,
        max: 90,
        required: true,
      },
    },
  },

  // Color control command
  {
    id: "set-color",
    title: "Set LED Color",
    subtitle: "Change LED indicator color",
    icon: "palette",
    command: "set_color",
    description: "Set the LED color for device indicators",
    requiredCapability: "color",
    parameters: {
      color: {
        type: "string",
        options: ["warm", "cool", "daylight"],
        required: true,
      },
    },
  },
];

/**
 * Retrieves a device command definition by its unique identifier
 *
 * @param id - The unique identifier of the command to find
 * @returns The command definition if found, undefined otherwise
 */
export const getCommandById = (id: string): DeviceCommandDefinition | undefined => {
  return DEVICE_COMMANDS.find((cmd) => cmd.id === id);
};

/**
 * Retrieves all device commands that match a specific command type
 *
 * @param commandType - The command type to filter by (e.g., "toggle", "set_speed")
 * @returns Array of command definitions matching the specified type
 */
export const getCommandsByType = (commandType: DeviceCommandType): DeviceCommandDefinition[] => {
  return DEVICE_COMMANDS.filter((cmd) => cmd.command === commandType);
};

/**
 * Retrieves all simple commands that don't require parameters
 *
 * @returns Array of command definitions without parameters
 */
export const getSimpleCommands = (): DeviceCommandDefinition[] => {
  return DEVICE_COMMANDS.filter((cmd) => !cmd.parameters);
};

/**
 * Retrieves all commands that require user input parameters
 *
 * @returns Array of command definitions that have parameters
 */
export const getParametrizedCommands = (): DeviceCommandDefinition[] => {
  return DEVICE_COMMANDS.filter((cmd) => cmd.parameters);
};

/**
 * Retrieves all commands available for a specific device based on its capabilities
 *
 * This function filters the command list to only include commands that the device
 * can actually execute based on its hardware capabilities.
 *
 * @param device - The device to get available commands for
 * @returns Array of command definitions that the device supports
 */
export const getAvailableCommandsForDevice = (device: Device): DeviceCommandDefinition[] => {
  return DEVICE_COMMANDS.filter((cmd) => {
    // If no capability is required, the command is always available
    if (!cmd.requiredCapability) return true;
    // Check if the device supports the required capability
    return hasCapability(device, cmd.requiredCapability as keyof DeviceCapabilities);
  });
};

/**
 * Checks if a specific command is available for a given device
 *
 * @param device - The device to check command availability for
 * @param commandId - The unique identifier of the command to check
 * @returns true if the command is available for the device, false otherwise
 */
export const isCommandAvailableForDevice = (device: Device, commandId: string): boolean => {
  const command = getCommandById(commandId);
  // If command doesn't exist or has no capability requirement, it's available
  if (!command || !command.requiredCapability) return true;
  // Check if the device supports the required capability
  return hasCapability(device, command.requiredCapability as keyof DeviceCapabilities);
};
