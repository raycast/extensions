import type { WifiNetwork } from "./types";

export const DEMO_STORAGE_KEY = "wifiInspectorUseDemoData";

/**
 * Fixture networks for Store screenshot capture during `ray develop` only.
 */
export const DEMO_NETWORKS: WifiNetwork[] = [
  {
    ssid: "Office WiFi",
    bssid: "aa:bb:cc:dd:ee:ff",
    rssi: -52,
    noise: -92,
    channel: 149,
    channel_band: "5GHz",
    channel_width: 80,
    security: "WPA2 Personal",
    phy_mode: "802.11ac",
    current: true,
    saved: true,
  },
  {
    ssid: "Conference Room",
    bssid: "77:88:99:aa:bb:cc",
    rssi: -58,
    noise: -90,
    channel: 100,
    channel_band: "5GHz",
    channel_width: 160,
    security: "WPA3 Personal",
    phy_mode: "802.11ax",
    current: false,
    saved: true,
  },
  {
    ssid: "Guest",
    bssid: "11:22:33:44:55:66",
    rssi: -71,
    noise: -88,
    channel: 36,
    channel_band: "5GHz",
    channel_width: 80,
    security: "WPA2 Personal",
    phy_mode: "802.11ac",
    current: false,
    saved: false,
  },
  {
    ssid: "Cafe Free WiFi",
    bssid: "de:ad:be:ef:00:01",
    rssi: -78,
    noise: -85,
    channel: 6,
    channel_band: "2.4GHz",
    channel_width: 20,
    security: "Open",
    phy_mode: "802.11n",
    current: false,
    saved: false,
  },
  {
    ssid: "MyHomeWiFi",
    bssid: "",
    rssi: 0,
    noise: 0,
    channel: 0,
    channel_band: "unknown",
    channel_width: 0,
    security: "WPA2 Personal",
    phy_mode: "",
    current: false,
    saved: true,
  },
];
