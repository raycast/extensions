import path from "node:path";
import { environment } from "@raycast/api";
import { colorsForBackground } from "./vendor/badge-maker-color.js";
import { CommandConfig } from "./types.js";

export const badgeStyles = ["flat", "flat-square", "plastic", "for-the-badge", "social"];
export const badgeSizes = ["default", "auto"];
export const dynamicBadgeTypes = ["json", "toml", "xml", "yaml"];

export const commandConfig: CommandConfig = {
  createDynamicBadge: {
    defaultBadge: {
      $type: "json",
      url: "https://github.com/raycast/extensions/raw/main/extensions/badges/package.json",
      query: "$.title",
      label: "Dynamic Badge",
    },
    parameterIds: ["Type", "Url", "Query", "Prefix", "Suffix", "Label", "Color", "LabelColor", "Logo", "Style"],
    validationFields: ["url", "query"],
  },
  createEndpointBadge: {
    defaultBadge: {
      url: "https://gist.githubusercontent.com/LitoMore/aae8985fe6c2b4429db05570247d2a7a/raw/endpoint-badge-example",
    },
    parameterIds: ["Url", "Label", "Message", "Color", "LabelColor", "Logo", "Style"],
    validationFields: ["url"],
  },
  createSocialBadge: {
    defaultBadge: {
      $icon: {
        title: "Raycast",
        slug: "raycast",
        hex: "FF6363",
        source: "",
        file: path.join(environment.assetsPath, "raycast.svg"),
      },
      logo: "raycast",
      label: "Raycast",
      color: "FF6363",
      labelColor: undefined,
      logoColor: colorsForBackground("#FF6363"),
      style: "flat-square",
    },
    parameterIds: ["Logo", "Style", "Label", "Message", "Color", "LabelColor"],
    validationFields: ["color", "labelColor", "logoColor"],
  },
  createStaticBadge: {
    defaultBadge: {
      label: "label",
      message: "message",
      color: "blue",
    },
    parameterIds: ["Label", "Message", "Color", "LabelColor", "Logo", "Style"],
    validationFields: ["color", "labelColor", "logoColor"],
  },
};
