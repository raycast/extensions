import type { Device } from "../types";
import { logger } from "../utils/logger";

/**
 * Interface defining the capabilities supported by Atomberg devices
 * Each boolean property indicates whether a specific feature is supported
 */
export interface DeviceCapabilities {
  /** Power on/off functionality */
  power: boolean;
  /** Speed control (multiple speed levels) */
  speed: boolean;
  /** Sleep mode functionality */
  sleep: boolean;
  /** Timer functionality */
  timer: boolean;
  /** LED indicator control */
  led: boolean;
  /** Brightness adjustment capability */
  brightness: boolean;
  /** Color change capability (RGB control) */
  color: boolean;
}

// Device capability mapping based on model and series from API documentation
// Key format: "model_series" (e.g., "renesa_r1", "aris_starlight_i1")
const DEVICE_CAPABILITIES: Record<string, DeviceCapabilities> = {
  // Renesa series - Basic fan with LED control
  renesa_r1: {
    power: true,
    speed: true,
    sleep: true,
    timer: true,
    led: true,
    brightness: false,
    color: false,
  },

  // Renesa Halo series - Enhanced LED ring with basic features
  renesa_halo_r1: {
    power: true,
    speed: true,
    sleep: true,
    timer: true,
    led: true,
    brightness: false,
    color: false,
  },
  renesa_halo_r2: {
    power: true,
    speed: true,
    sleep: true,
    timer: true,
    led: true,
    brightness: false,
    color: false,
  },

  // Renesa+ series - Premium version with enhanced features
  "renesa+_r1": {
    power: true,
    speed: true,
    sleep: true,
    timer: true,
    led: true,
    brightness: false,
    color: false,
  },

  // Studio+ series - Studio-focused model
  "studio+_r1": {
    power: true,
    speed: true,
    sleep: true,
    timer: true,
    led: true,
    brightness: false,
    color: false,
  },

  // Erica series - Compact design
  erica_k1: {
    power: true,
    speed: true,
    sleep: true,
    timer: true,
    led: true,
    brightness: false,
    color: false,
  },

  // Aris Starlight I1 series - ONLY model supporting both brightness AND color
  // This is the premium model with full RGB and brightness control
  aris_starlight_i1: {
    power: true,
    speed: true,
    sleep: true,
    timer: true,
    led: true,
    brightness: true,
    color: true,
  },

  // Aris I2 series - Basic features only (entry-level model)
  aris_i2: {
    power: true,
    speed: true,
    sleep: true,
    timer: true,
    led: true,
    brightness: false,
    color: false,
  },

  // Aris Contour M1 series - Supports brightness change only (no color)
  aris_contour_m1: {
    power: true,
    speed: true,
    sleep: true,
    timer: true,
    led: true,
    brightness: true,
    color: false,
  },

  // Renesa Elite S1 series - Supports brightness change only (no color)
  renesa_elite_s1: {
    power: true,
    speed: true,
    sleep: true,
    timer: true,
    led: true,
    brightness: true,
    color: false,
  },

  // Studio Nexus S1 series - Supports brightness change only (no color)
  studio_nexus_s1: {
    power: true,
    speed: true,
    sleep: true,
    timer: true,
    led: true,
    brightness: true,
    color: false,
  },
};

// Default capabilities for unknown models
// Assumes basic functionality for safety (power, speed, sleep, timer, led)
// Does not assume advanced features like brightness or color control
const DEFAULT_CAPABILITIES: DeviceCapabilities = {
  power: true,
  speed: true,
  sleep: true,
  timer: true,
  led: true,
  brightness: false,
  color: false,
};

/**
 * Retrieves the capabilities for a specific device based on its model and series
 *
 * This function implements a multi-level fallback strategy:
 * 1. Exact match using "model_series" key
 * 2. Case-insensitive match as fallback
 * 3. Series-only match for unknown models
 * 4. Default capabilities for completely unknown devices
 *
 * @param device - The device object containing model and series information
 * @returns DeviceCapabilities object indicating which features are supported
 */
export function getDeviceCapabilities(device: Device): DeviceCapabilities {
  // Convert API response to lowercase and use underscores for consistency
  // This normalizes the format to match our capability mapping keys
  const normalizedModel = device.model.toLowerCase();
  const normalizedSeries = device.series.toLowerCase();
  const exactKey = `${normalizedModel}_${normalizedSeries}`;

  // Strategy 1: Try exact match first for best performance
  if (DEVICE_CAPABILITIES[exactKey]) {
    return DEVICE_CAPABILITIES[exactKey];
  }

  // Strategy 2: Try case-insensitive match as fallback
  // This handles minor formatting differences in API responses
  const caseInsensitiveKey = Object.keys(DEVICE_CAPABILITIES).find(
    (key) => key.toLowerCase() === exactKey.toLowerCase(),
  );
  if (caseInsensitiveKey) {
    return DEVICE_CAPABILITIES[caseInsensitiveKey];
  }

  // Strategy 3: Try partial match by series only (fallback for unknown models)
  // This is useful when a new model is released but follows existing series patterns
  const seriesOnlyKey = Object.keys(DEVICE_CAPABILITIES).find((key) =>
    key.toLowerCase().endsWith(`_${normalizedSeries}`),
  );
  if (seriesOnlyKey) {
    logger.info(`Using series-based fallback for ${device.model} ${device.series}: ${seriesOnlyKey}`);
    return DEVICE_CAPABILITIES[seriesOnlyKey];
  }

  // Strategy 4: Return default capabilities for completely unknown devices
  // This ensures the app doesn't crash and provides a safe fallback
  return DEFAULT_CAPABILITIES;
}

/**
 * Checks if a specific device supports a particular capability
 *
 * @param device - The device to check capabilities for
 * @param capability - The specific capability to check
 * @returns true if the device supports the capability, false otherwise
 */
export function hasCapability(device: Device, capability: keyof DeviceCapabilities): boolean {
  const capabilities = getDeviceCapabilities(device);
  return capabilities[capability];
}

/**
 * Gets a list of all capabilities supported by a specific device
 *
 * @param device - The device to get capabilities for
 * @returns Array of capability names that the device supports
 */
export function getSupportedCapabilities(device: Device): (keyof DeviceCapabilities)[] {
  const capabilities = getDeviceCapabilities(device);
  return Object.entries(capabilities)
    .filter(([, supported]) => supported)
    .map(([capability]) => capability as keyof DeviceCapabilities);
}
