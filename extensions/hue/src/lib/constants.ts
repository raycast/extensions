export const APP_NAME = "raycast_hue_extension";
export const BRIDGE_ID = "bridgeId";
export const BRIDGE_IP_ADDRESS_KEY = "bridgeIpAddress";
export const BRIDGE_USERNAME_KEY = "bridgeUsername";

// TODO: Reverse brightnesses so that 100 is the first element
export const BRIGHTNESSES = [1, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
export const BRIGHTNESS_MIN = BRIGHTNESSES[0];
export const BRIGHTNESS_MAX = BRIGHTNESSES[BRIGHTNESSES.length - 1];
export const MIRED_MIN = 153;
export const MIRED_MAX = 500;
export const MIRED_STEP = (500.0 - 153.0) / 10.0;
export const MIRED_DEFAULT = 357;
/**
 * The mired from Hue's API is too warm, so we make it cooler by an arbitrary amount
 */
export const MIRED_ADJUSTMENT = -50;
/**
 * We darken colors by 1 / <1 – 100> times this factor using chroma.js
 */
export const CHROMA_DARKEN_FACTOR = 3;
