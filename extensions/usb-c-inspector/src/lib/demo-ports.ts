import type { WhatCableOutput } from "./types";

/**
 * Fixture ports for Store screenshot capture during `ray develop` only.
 * Mirrors the marketing mockup (charging / Thunderbolt / slow MagSafe / empty).
 */
export const DEMO_OUTPUT: WhatCableOutput = {
  version: "demo",
  isDesktopMac: false,
  ports: [
    {
      name: "Port 4 (USB-C)",
      type: "USB-C",
      className: "AppleUSBXHCIPCIPort",
      connectionActive: true,
      pdCapable: true,
      status: "Charging",
      headline: "Charging · 65W",
      subtitle: "Power is flowing. No data connection.",
      bullets: ["Charger and cable are well-matched."],
      cable: {
        vendorName: "Lenovo",
        speed: null,
        currentRating: "5A",
        maxWatts: 100,
        type: "USB-C",
        certification: {
          listings: [{ company: "USB-IF", model: "Certified Cable", status: "Active", date: "2024-01-01" }],
        },
      },
      device: {
        kind: "Power Brick",
        vendorName: "Lenovo 0x17EF",
        pdRevision: "3.0",
      },
      charging: {
        summary: "Charging (Optimized)",
        detail:
          "Charger and cable are well-matched. The Mac draws what it needs moment to moment, up to this negotiated limit. Negotiated 20V @ 3.25A (65W).",
        bottleneck: "none",
        isWarning: false,
      },
      dataLink: {
        summary: "None (Power Only)",
        detail: "No high-speed data path is active on this port.",
        bottleneck: "none",
        isWarning: false,
      },
      transports: { supported: ["USB4", "USB-PD"], active: [], usb3Speed: null },
    },
    {
      name: "Port 1 (USB-C)",
      type: "USB-C",
      className: "AppleUSBXHCIPCIPort",
      connectionActive: true,
      pdCapable: true,
      status: "Data",
      headline: "Thunderbolt · 40Gbps",
      subtitle: "High-speed data link active.",
      bullets: ["External SSD at full Thunderbolt bandwidth."],
      cable: {
        vendorName: "Apple",
        speed: "40Gbps",
        currentRating: "3A",
        maxWatts: 60,
        type: "USB-C",
      },
      device: {
        kind: "External SSD",
        vendorName: "Samsung",
        pdRevision: "3.0",
      },
      charging: {
        summary: "Bus-powered",
        detail: "The SSD draws bus power from the Mac. The Mac is not charging from this port.",
        bottleneck: "none",
        isWarning: false,
      },
      dataLink: {
        summary: "Thunderbolt 4",
        detail: "Thunderbolt 4 tunnel is up. External SSD is negotiating full 40Gbps bandwidth over a certified cable.",
        bottleneck: "none",
        isWarning: false,
      },
      transports: {
        supported: ["Thunderbolt", "USB4", "USB-PD"],
        active: ["Thunderbolt"],
        usb3Speed: "40Gbps",
      },
      devices: [
        {
          name: "Samsung Portable SSD T7 Shield",
          vendorID: 0x04e8,
          productID: 0x6001,
          vendorName: "Samsung",
          speed: "40Gbps",
          locationID: "0x01200000",
        },
      ],
    },
    {
      name: "Port 2 (MagSafe 3)",
      type: "MagSafe 3",
      className: "AppleMagSafe",
      connectionActive: true,
      pdCapable: true,
      status: "Slow Charging",
      headline: "Slow Charging · 30W",
      subtitle: "Charger is underpowered for this Mac.",
      bullets: ["Expect longer charge times under load."],
      cable: {
        vendorName: "Apple",
        speed: null,
        currentRating: "MagSafe 3",
        maxWatts: 30,
        type: "MagSafe 3",
      },
      device: {
        kind: "MagSafe Charger",
        vendorName: "Apple",
        pdRevision: "3.0",
      },
      charging: {
        summary: "Slow Charging",
        detail:
          "MagSafe is connected, but the adapter only offers 30W. Expect longer charge times or battery drain under load. Negotiated 15V @ 2A (30W).",
        bottleneck: "charger",
        isWarning: true,
      },
      dataLink: {
        summary: "None (Power Only)",
        detail: "MagSafe carries power only.",
        bottleneck: "none",
        isWarning: false,
      },
      transports: { supported: ["USB-PD"], active: [], usb3Speed: null },
    },
    {
      name: "Port 3 (USB-C)",
      type: "USB-C",
      className: "AppleUSBXHCIPCIPort",
      connectionActive: false,
      pdCapable: true,
      status: "Empty",
      headline: "Empty",
      subtitle: "Nothing connected.",
      bullets: [],
      cable: null,
      device: null,
      charging: null,
      dataLink: null,
      transports: { supported: ["USB4", "USB-PD"], active: [], usb3Speed: null },
    },
  ],
};

export const DEMO_STORAGE_KEY = "usbCInspectorUseDemoData";
