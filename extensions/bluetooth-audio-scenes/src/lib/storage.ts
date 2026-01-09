// Shared storage keys used by both Devices and Scenes commands

// Maps BT address -> audio output name (user-selected or from scene creation)
export type OutputMap = Record<string, string>;

// Maps BT address -> last used timestamp (for sorting)
export type LastUsedMap = Record<string, number>;

// Shared key - mappings are shared between Devices and Scenes
export const OUTPUT_MAP_KEY = "bt-audio-output-map";

// Shared key - last used timestamps for devices
export const LAST_USED_KEY = "bt-last-used-map";
