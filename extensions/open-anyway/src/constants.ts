/**
 * Constants for the Open Anyway Raycast extension.
 * Defines deep links, bundle IDs, and timing configurations for macOS Gatekeeper navigation.
 */

/**
 * Modern macOS (Ventura 13.0+, Sonoma 14.0+, Sequoia 15.0+, macOS 27+)
 * System Settings deep link to the Privacy & Security extension pane.
 */
export const MODERN_SETTINGS_SECURITY_URL = "x-apple.systempreferences:com.apple.settings.PrivacySecurity.extension";

/**
 * Legacy macOS (Monterey 12.0 and earlier) System Preferences URL.
 * Also supported as a backwards-compatibility alias in modern macOS.
 */
export const LEGACY_PREFERENCES_SECURITY_URL = "x-apple.systempreferences:com.apple.preference.security?Privacy";

/**
 * Fallback legacy Security preference pane URL.
 */
export const LEGACY_PREFERENCES_FALLBACK_URL = "x-apple.systempreferences:com.apple.preference.security";

/**
 * Bundle Identifier for macOS System Settings / System Preferences.
 */
export const SYSTEM_SETTINGS_BUNDLE_ID = "com.apple.systempreferences";

/**
 * Maximum time (in milliseconds) allowed for blocked application detection.
 * Kept low (1500ms) to ensure the Raycast command responds promptly without perceptible lag.
 */
export const DETECTION_TIMEOUT_MS = 2500;

/**
 * Lookback window for unified logging search of syspolicyd Gatekeeper rejections.
 */
export const LOG_LOOKBACK_WINDOW = "10m";
