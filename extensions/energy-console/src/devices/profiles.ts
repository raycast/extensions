import type { EcoFlowApiDevice } from "../api/types";
import type { DeviceProfile } from "../types/device";

const DOCS_ROOT = "https://developer-eu.ecoflow.com/us/document";

export const UNKNOWN_DEVICE_PROFILE: DeviceProfile = {
  family: "unknown",
  displayName: "EcoFlow Device",
  category: "unknown",
  prefixes: [],
  searchTerms: [],
  documentationUrl: `${DOCS_ROOT}/introduction`,
};

export const DEVICE_PROFILES: readonly DeviceProfile[] = [
  {
    family: "power-ocean",
    displayName: "PowerOcean",
    category: "home-battery",
    prefixes: ["HJ31"],
    searchTerms: ["powerocean", "power ocean"],
    documentationUrl: `${DOCS_ROOT}/PP2?id=2058834730374828033`,
  },
  {
    family: "powerstream",
    displayName: "PowerStream",
    category: "solar",
    prefixes: ["HW51"],
    searchTerms: ["powerstream", "power stream", "microinverter"],
    documentationUrl: `${DOCS_ROOT}/PP3?id=2058828968760086530`,
  },
  {
    family: "stream",
    displayName: "STREAM",
    category: "home-battery",
    prefixes: ["BK31", "BK11", "BK41", "BK51"],
    searchTerms: ["stream"],
    documentationUrl: `${DOCS_ROOT}/PP3?id=2058828605315256321`,
  },
  {
    family: "delta-3-max-plus",
    displayName: "DELTA 3 Max Plus",
    category: "power-station",
    prefixes: ["D3M1"],
    searchTerms: ["delta 3 max plus"],
    documentationUrl: `${DOCS_ROOT}/PP?id=2059180566413742081`,
  },
  {
    family: "delta-3-max",
    displayName: "DELTA 3 Max",
    category: "power-station",
    prefixes: ["D3N1"],
    searchTerms: ["delta 3 max"],
    documentationUrl: `${DOCS_ROOT}/PP?id=2059180645564452865`,
  },
  {
    family: "delta-pro",
    displayName: "DELTA Pro",
    category: "power-station",
    prefixes: ["DCAB"],
    searchTerms: ["delta pro"],
    documentationUrl: `${DOCS_ROOT}/PP?id=2058836526572933122`,
  },
  {
    family: "delta-pro-ultra",
    displayName: "DELTA Pro Ultra",
    category: "power-station",
    prefixes: ["Y711", "DCBP"],
    searchTerms: ["delta pro ultra"],
    documentationUrl: `${DOCS_ROOT}/PP?id=2058836398269173762`,
  },
  {
    family: "delta-pro-3",
    displayName: "DELTA Pro 3",
    category: "power-station",
    prefixes: ["MR51"],
    searchTerms: ["delta pro 3"],
    documentationUrl: `${DOCS_ROOT}/PP?id=2058834554348277761`,
  },
  {
    family: "river-2-pro",
    displayName: "RIVER 2 Pro",
    category: "power-station",
    prefixes: ["R621"],
    searchTerms: ["river 2 pro"],
    documentationUrl: `${DOCS_ROOT}/PP?id=2058829039341834242`,
  },
  {
    family: "delta-2-max",
    displayName: "DELTA 2 Max",
    category: "power-station",
    prefixes: ["R351"],
    searchTerms: ["delta 2 max"],
    documentationUrl: `${DOCS_ROOT}/PP?id=2058828363647848450`,
  },
  {
    family: "delta-2",
    displayName: "DELTA 2",
    category: "power-station",
    prefixes: ["R331"],
    searchTerms: ["delta 2"],
    documentationUrl: `${DOCS_ROOT}/PP?id=2058826514068836353`,
  },
  {
    family: "delta-max",
    displayName: "DELTA Max",
    category: "power-station",
    prefixes: ["DAEB"],
    searchTerms: ["delta max"],
  },
  {
    family: "delta-mini",
    displayName: "DELTA mini",
    category: "power-station",
    prefixes: ["DAAB"],
    searchTerms: ["delta mini"],
  },
  {
    family: "river-2",
    displayName: "RIVER 2",
    category: "power-station",
    prefixes: ["R611"],
    searchTerms: ["river 2"],
  },
  {
    family: "river-2-max",
    displayName: "RIVER 2 Max",
    category: "power-station",
    prefixes: ["R631"],
    searchTerms: ["river 2 max"],
  },
  {
    family: "river-pro",
    displayName: "RIVER Pro",
    category: "power-station",
    prefixes: ["EFAB"],
    searchTerms: ["river pro"],
  },
  {
    family: "smart-home-panel-2",
    displayName: "Smart Home Panel 2",
    category: "whole-home",
    prefixes: ["HD31", "SP20"],
    searchTerms: ["smart home panel 2", "smarthomepanelii"],
    documentationUrl: `${DOCS_ROOT}/PP4?id=2058834253029478401`,
  },
  {
    family: "smart-home-panel",
    displayName: "Smart Home Panel",
    category: "whole-home",
    prefixes: ["SP10"],
    searchTerms: ["smart home panel"],
    documentationUrl: `${DOCS_ROOT}/PP4?id=2058837749501956098`,
  },
  {
    family: "power-kits",
    displayName: "Power Kits",
    category: "power-kit",
    prefixes: ["M106"],
    searchTerms: ["power kits", "powerkit"],
    documentationUrl: `${DOCS_ROOT}/PP1?id=2058828885360545794`,
  },
  {
    family: "smart-plug",
    displayName: "Smart Plug",
    category: "smart-plug",
    prefixes: ["HW52"],
    searchTerms: ["smart plug"],
    documentationUrl: `${DOCS_ROOT}/PP1?id=2058829161769373697`,
  },
  {
    family: "glacier",
    displayName: "GLACIER",
    category: "appliance",
    prefixes: ["BX11"],
    searchTerms: ["glacier"],
    documentationUrl: `${DOCS_ROOT}/PP1?id=2058828764304543745`,
  },
  {
    family: "wave",
    displayName: "WAVE Air Conditioner",
    category: "appliance",
    prefixes: ["KT21", "KT10"],
    searchTerms: ["wave", "wave 2"],
    documentationUrl: `${DOCS_ROOT}/PP1?id=2058839655007817730`,
  },
];

export function detectDeviceProfile(
  device: Pick<EcoFlowApiDevice, "sn" | "deviceName" | "productName">,
): DeviceProfile {
  const serialNumber = device.sn.toUpperCase();
  const prefixMatch = DEVICE_PROFILES.flatMap((profile) =>
    profile.prefixes.map((prefix) => ({ prefix: prefix.toUpperCase(), profile })),
  )
    .sort((left, right) => right.prefix.length - left.prefix.length)
    .find(({ prefix }) => serialNumber.startsWith(prefix));

  if (prefixMatch) return prefixMatch.profile;

  const descriptiveText = `${device.productName ?? ""} ${device.deviceName ?? ""}`.toLowerCase();
  const termMatch = DEVICE_PROFILES.flatMap((profile) => profile.searchTerms.map((term) => ({ term, profile })))
    .sort((left, right) => right.term.length - left.term.length)
    .find(({ term }) => descriptiveText.includes(term));

  return termMatch?.profile ?? UNKNOWN_DEVICE_PROFILE;
}
