import { SwingMode } from "./enums";

/**
 * These constants are extracted from the official Panasonic MirAIe Android application.
 * They are used to identify the client application to the MirAIe authentication and API servers.
 */
export const MIRAIE_APP_CLIENT_ID = "PBcMcfG19njNCL8AOgvRzIC8AjQa";
export const MIRAIE_APP_SCOPE = "an_14214235325";

export const LOGIN_URL = "https://auth.miraie.in/simplifi/v1/userManagement/login";
export const HOMES_URL = "https://app.miraie.in/simplifi/v1/homeManagement/homes";
export const STATUS_URL = "https://app.miraie.in/simplifi/v1/deviceManagement/devices/{deviceId}/mobile/status";
export const DEVICE_DETAILS_URL = "https://app.miraie.in/simplifi/v1/deviceManagement/devices/deviceId";
export const ENERGY_CONSUMPTION_URL =
  "https://app.miraie.in/simplifi/v1/powerConsumption/devices/{deviceId}?grain={periodType}&startDate={fromDate}&endDate={toDate}";

// MQTT configuration
export const MQTT_HOST = "mqtt.miraie.in";
export const MQTT_PORT = 8883;
export const MQTT_USE_SSL = true;

// MQTT Payload defaults (extracted from official app)
export const MQTT_PAYLOAD_KI = 1;
export const MQTT_PAYLOAD_CNT = "an";
export const MQTT_PAYLOAD_SID = "1";

export const SWING_MODE_LABELS = {
  vertical: {
    [SwingMode.AUTO]: "Auto",
    [SwingMode.ONE]: "Up",
    [SwingMode.TWO]: "Position 2",
    [SwingMode.THREE]: "Position 3",
    [SwingMode.FOUR]: "Position 4",
    [SwingMode.FIVE]: "Down",
  },
  horizontal: {
    [SwingMode.AUTO]: "Auto",
    [SwingMode.ONE]: "Center",
    [SwingMode.TWO]: "Left",
    [SwingMode.THREE]: "Position 3",
    [SwingMode.FOUR]: "Position 4",
    [SwingMode.FIVE]: "Right",
  },
} as const;

export const MIN_TEMPERATURE = 16;
export const MAX_TEMPERATURE = 30;
