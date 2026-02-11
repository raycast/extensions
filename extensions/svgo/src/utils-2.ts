import { environment } from "@raycast/api";
import fs from "node:fs";
import { PluginConfig } from "svgo";

export type SVGOPlugin = { id: PluginConfig; name: string; enabledByDefault: boolean; description: string };

export const defaultConfig: SVGOPlugin[] = [
  {
    id: "removeDoctype",
    name: "Remove doctype",
    enabledByDefault: true,
    description: "",
  },
  {
    id: "removeXMLProcInst",
    name: "Remove XML instructions",
    enabledByDefault: true,
    description: "",
  },
  {
    id: "removeComments",
    name: "Remove comments",
    enabledByDefault: true,
    description: "",
  },
  {
    id: "removeMetadata",
    name: "Remove <metadata>",
    enabledByDefault: true,
    description: "",
  },
  {
    id: "removeXMLNS",
    name: "Remove xmlns",
    enabledByDefault: false,
    description: "",
  },
  {
    id: "removeEditorsNSData",
    name: "Remove editor data",
    enabledByDefault: true,
    description: "",
  },
  {
    id: "cleanupAttrs",
    name: "Clean up attribute whitespace",
    enabledByDefault: true,
    description: "",
  },
  {
    id: "mergeStyles",
    name: "Merge styles",
    enabledByDefault: true,
    description: "",
  },
  {
    id: "inlineStyles",
    name: "Inline styles",
    enabledByDefault: true,
    description: "",
  },
  {
    id: "minifyStyles",
    name: "Minify styles",
    enabledByDefault: true,
    description: "",
  },
  {
    id: "convertStyleToAttrs",
    name: "Style to attributes",
    enabledByDefault: false,
    description: "",
  },
  {
    id: "cleanupIds",
    name: "Clean up IDs",
    enabledByDefault: false,
    description: "",
  },
  {
    id: "removeRasterImages",
    name: "Remove raster images",
    enabledByDefault: false,
    description: "",
  },
  {
    id: "removeUselessDefs",
    name: "Remove unused defs",
    enabledByDefault: true,
    description: "",
  },
  {
    id: "cleanupNumericValues",
    name: "Round/rewrite numbers",
    enabledByDefault: true,
    description: "",
  },
  {
    id: "cleanupListOfValues",
    name: "Round/rewrite number lists",
    enabledByDefault: false,
    description: "",
  },
  {
    id: "convertColors",
    name: "Minify colours",
    enabledByDefault: true,
    description: "",
  },
  {
    id: "removeUnknownsAndDefaults",
    name: "Remove unknowns & defaults",
    enabledByDefault: true,
    description: "",
  },
  {
    id: "removeNonInheritableGroupAttrs",
    name: "Remove unneeded group attrs",
    enabledByDefault: true,
    description: "",
  },
  {
    id: "removeUselessStrokeAndFill",
    name: "Remove useless stroke & fill",
    enabledByDefault: true,
    description: "",
  },
  {
    id: "removeViewBox",
    name: "Remove viewBox",
    enabledByDefault: false,
    description: "",
  },
  {
    id: "cleanupEnableBackground",
    name: "Remove/tidy enable-background",
    enabledByDefault: true,
    description: "",
  },
  {
    id: "removeHiddenElems",
    name: "Remove hidden elements",
    enabledByDefault: true,
    description: "",
  },
  {
    id: "removeEmptyText",
    name: "Remove empty text",
    enabledByDefault: true,
    description: "",
  },
  {
    id: "convertShapeToPath",
    name: "Shapes to (smaller) paths",
    enabledByDefault: true,
    description: "",
  },
  {
    id: "moveElemsAttrsToGroup",
    name: "Move attrs to parent group",
    enabledByDefault: true,
    description: "",
  },
  {
    id: "moveGroupAttrsToElems",
    name: "Move group attrs to elements",
    enabledByDefault: true,
    description: "",
  },
  {
    id: "collapseGroups",
    name: "Collapse useless groups",
    enabledByDefault: true,
    description: "",
  },
  {
    id: "convertPathData",
    name: "Round/rewrite paths",
    enabledByDefault: true,
    description: "",
  },
  {
    id: "convertEllipseToCircle",
    name: "Convert non-eccentric <ellipse> to <circle>",
    enabledByDefault: true,
    description: "",
  },
  {
    id: "convertTransform",
    name: "Round/rewrite transforms",
    enabledByDefault: true,
    description: "",
  },
  {
    id: "removeEmptyAttrs",
    name: "Remove empty attrs",
    enabledByDefault: true,
    description: "",
  },
  {
    id: "removeEmptyContainers",
    name: "Remove empty containers",
    enabledByDefault: true,
    description: "",
  },
  {
    id: "mergePaths",
    name: "Merge paths",
    enabledByDefault: true,
    description: "",
  },
  {
    id: "removeUnusedNS",
    name: "Remove unused namespaces",
    enabledByDefault: true,
    description: "",
  },
  {
    id: "reusePaths",
    name: "Replace duplicate elements with links",
    enabledByDefault: false,
    description: "",
  },
  {
    id: "sortAttrs",
    name: "Sort attrs",
    enabledByDefault: true,
    description: "",
  },
  {
    id: "sortDefsChildren",
    name: "Sort children of <defs>",
    enabledByDefault: true,
    description: "",
  },
  {
    id: "removeTitle",
    name: "Remove <title>",
    enabledByDefault: true,
    description: "",
  },
  {
    id: "removeDesc",
    name: "Remove <desc>",
    enabledByDefault: true,
    description: "",
  },
  {
    id: "removeDimensions",
    name: "Prefer viewBox to width/height",
    enabledByDefault: false,
    description: "",
  },
  {
    id: "removeStyleElement",
    name: "Remove style elements",
    enabledByDefault: false,
    description: "",
  },
  {
    id: "removeScriptElement",
    name: "Remove script elements",
    enabledByDefault: false,
    description: "",
  },
  {
    id: "removeOffCanvasPaths",
    name: "Remove out-of-bounds paths",
    enabledByDefault: false,
    description: "",
  },
];

const configPath = `${environment.supportPath}/.svgo-config.json`;

function getAllConfig(): SVGOPlugin[] {
  try {
    const savedConfig = fs.readFileSync(configPath, "utf8");
    return JSON.parse(savedConfig) as SVGOPlugin[];
  } catch (err) {
    console.error("Failed to parse json", err);
    return defaultConfig;
  }
}

function getEnabledPlugins(): PluginConfig[] {
  try {
    const config = getAllConfig();
    return config.filter((item) => item.enabledByDefault).map((item) => item.id);
  } catch (err) {
    console.error("Failed to get enabled plugins", err);
    return [];
  }
}

function saveConfig(config: object) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config));
  } catch (err) {
    console.error("error saving config", err);
  }
}

function restore() {
  try {
    saveConfig(defaultConfig);
  } catch (err) {
    console.error("error restore config", err);
  }
}

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KiB", "MiB", "GiB", "TiB", "PiB", "EiB", "ZiB", "YiB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export const configHelper = {
  getAllConfig,
  saveConfig,
  restore,
  getEnabledPlugins,
  formatBytes,
};
