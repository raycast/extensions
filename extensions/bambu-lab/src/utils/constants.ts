/**
 * MQTT sequence IDs for different commands
 */
export const SEQUENCE_IDS = {
  LIGHT_CONTROL: "2000",
  BED_PREHEAT: "2002",
  NOZZLE_PREHEAT: "2003",
  PRINT_CONTROL: "6000",
  PUSH_ALL: "0",
} as const;

/**
 * MQTT connection settings
 */
export const MQTT_CONFIG = {
  USERNAME: "bblp",
  PORT: 8883,
  CONNECTION_TIMEOUT_MS: 5000,
  CONNECTION_CHECK_INTERVAL_MS: 100,
  MAX_CONNECTION_ATTEMPTS: 50,
} as const;

/**
 * FTP connection settings
 */
export const FTP_CONFIG = {
  USERNAME: "bblp",
  SECURE_PORT: 990,
  INSECURE_PORT: 21,
  PREHEAT_DELAY_MS: 200,
} as const;

/**
 * File system paths
 */
export const SD_CARD_PATHS = {
  ROOT: "/",
  CACHE: "/cache",
  MODEL: "/model",
} as const;
