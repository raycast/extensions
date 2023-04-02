export const APP_NAME = "raycast_hue_extension";
export const BRIDGE_ID = "bridgeId";
export const BRIDGE_IP_ADDRESS_KEY = "bridgeIpAddress";
export const BRIDGE_USERNAME_KEY = "bridgeUsername";

// TODO: Remove now that V2 API uses 0-100% values
export const BRIGHTNESSES = [1].concat(Array.from(Array(10).keys()).map((i) => i * 10 + 10)).reverse();
export const BRIGHTNESS_STEP = 25.4;
export const BRIGHTNESS_MAX = 254;
export const BRIGHTNESS_MIN = 1;
export const COLOR_TEMPERATURE_STEP = (500.0 - 153.0) / 10.0;
export const COLOR_TEMP_MAX = 500;
export const COLOR_TEMP_MIN = 153;
