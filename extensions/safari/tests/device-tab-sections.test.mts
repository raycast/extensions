import assert from "node:assert/strict";
import test from "node:test";
import { getDeviceTabSections } from "../src/device-tab-sections.ts";
import type { Device, Tab } from "../src/types.ts";

const devices: Device[] = [
  {
    uuid: "local:safari",
    name: "This Mac - Safari",
    tabs: [
      {
        uuid: "safari-tab",
        title: "Safari Result",
        url: "https://safari.example.com",
        is_local: true,
        window_id: 1,
        index: 1,
      },
    ],
  },
  {
    uuid: "local:safari-technology-preview",
    name: "This Mac - Safari Technology Preview",
    tabs: [
      {
        uuid: "technology-preview-tab",
        title: "Technology Preview Result",
        url: "https://technology-preview.example.com",
        is_local: true,
        window_id: 2,
        index: 1,
      },
    ],
  },
  {
    uuid: "local:safari-nightly",
    name: "This Mac - Safari Nightly",
    tabs: [
      {
        uuid: "nightly-tab",
        title: "Nightly Result",
        url: "https://nightly.example.com",
        is_local: true,
        window_id: 3,
        index: 1,
      },
    ],
  },
];

test("preserves Safari browser locations in combined tab results", () => {
  const sections = getDeviceTabSections(devices, (device) => device.tabs as Tab[]);

  assert.deepEqual(
    sections.map(({ device, tabs }) => ({
      device: device.name,
      tabs: tabs.map((tab) => tab.title),
    })),
    [
      { device: "This Mac - Safari", tabs: ["Safari Result"] },
      { device: "This Mac - Safari Technology Preview", tabs: ["Technology Preview Result"] },
      { device: "This Mac - Safari Nightly", tabs: ["Nightly Result"] },
    ],
  );
});

test("omits browser locations with no matching tabs", () => {
  const sections = getDeviceTabSections(devices, (device) =>
    device.uuid === "local:safari-technology-preview" ? [] : (device.tabs as Tab[]),
  );

  assert.deepEqual(
    sections.map(({ device }) => device.uuid),
    ["local:safari", "local:safari-nightly"],
  );
});
