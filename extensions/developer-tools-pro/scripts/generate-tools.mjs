#!/usr/bin/env node
// Generates `src/shared/tools.json` from the Flutter project's source files.
//
// Parses:
//   - <flutter-app>/lib/routing/app_routes.dart          → route constants
//   - <flutter-app>/lib/features/shared/models/tool.dart → tool entries
//
// Emits a JSON array of objects of shape:
//   { name, category, route, deepLink, description, supportsInput, iconName, keywords }
//
// The Flutter project path is resolved in this order:
//   1. --flutter-app <path> CLI flag
//   2. FLUTTER_APP_PATH env var
//   3. sibling directory: ../flutter_application_1 (relative to this script)
//
// Run:
//   node scripts/generate-tools.mjs
//   node scripts/generate-tools.mjs --flutter-app /path/to/flutter_app
//   FLUTTER_APP_PATH=/x/y node scripts/generate-tools.mjs

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXT_ROOT = resolve(__dirname, "..");

// ---------- 1. Resolve Flutter app path ----------
function resolveFlutterAppPath() {
  const argIdx = process.argv.indexOf("--flutter-app");
  if (argIdx !== -1 && process.argv[argIdx + 1]) {
    return resolve(process.argv[argIdx + 1]);
  }
  if (process.env.FLUTTER_APP_PATH) {
    return resolve(process.env.FLUTTER_APP_PATH);
  }
  // Default sibling layout: <parent>/flutter_application_1
  return resolve(EXT_ROOT, "..", "flutter_application_1");
}

const flutterAppPath = resolveFlutterAppPath();
const routesPath = join(flutterAppPath, "lib", "routing", "app_routes.dart");
const toolsPath = join(
  flutterAppPath,
  "lib",
  "features",
  "shared",
  "models",
  "tool.dart",
);

if (!existsSync(routesPath)) {
  console.error(`✖ Could not find app_routes.dart at: ${routesPath}`);
  console.error(`  Set the path with --flutter-app <path> or FLUTTER_APP_PATH env var.`);
  process.exit(1);
}
if (!existsSync(toolsPath)) {
  console.error(`✖ Could not find tool.dart at: ${toolsPath}`);
  process.exit(1);
}

// ---------- 2. Parse app_routes.dart for route constants ----------
// Looks for:   static const String foo = '/some/path';
const routesSrc = readFileSync(routesPath, "utf8");
const ROUTE_RE = /static\s+const\s+String\s+(\w+)\s*=\s*(['"`])([^'"`]+)\2/g;
/** @type {Record<string, string>} name → path */
const routes = {};
for (const m of routesSrc.matchAll(ROUTE_RE)) {
  routes[m[1]] = m[3];
}

// ---------- 3. Parse tool.dart entries ----------
// Strategy: split on `const Tool(` and parse each block. Each block's fields
// can span multiple lines, so we use a per-field regex within the block.
const toolsSrc = readFileSync(toolsPath, "utf8");
const toolBlocks = toolsSrc.split(/^\s*const\s+Tool\(/m).slice(1);

if (toolBlocks.length === 0) {
  console.error("✖ No `const Tool(...)` entries found in tool.dart");
  process.exit(1);
}

/** @typedef {{name:string, category:string, route:string, deepLink:string, description:string, keywords:string[]}} ToolEntry */

/** @type {ToolEntry[]} */
const tools = [];

for (const block of toolBlocks) {
  const name = extractString(block, "name");
  const category = extractString(block, "category");
  const routeRef = extractString(block, "route");
  const description = extractString(block, "description");
  const supportsInput = extractBool(block, "supportsDeepLinkInput");
  const dartIcon = extractString(block, "faIcon") || extractString(block, "icon");

  if (!name || !category || !routeRef) {
    // Skip malformed blocks (e.g. the class definition at the top).
    continue;
  }

  const routePath = routes[routeRef] ?? routeRef;
  const keywords = extractList(block, "keywords");
  const deepLink = buildDeepLink(routePath);
  const iconName = mapIcon(dartIcon, name, category);

  tools.push({
    name,
    category,
    route: routePath,
    deepLink,
    description: description ?? "",
    supportsInput,
    iconName,
    keywords,
  });
}

if (tools.length === 0) {
  console.error("✖ Parsed 0 tools. Check the format of tool.dart.");
  process.exit(1);
}

// ---------- 4. Emit JSON ----------
const outPath = join(EXT_ROOT, "src", "shared", "tools.json");
writeFileSync(outPath, JSON.stringify(tools, null, 2) + "\n", "utf8");
console.log(`✓ Exported ${tools.length} tools to ${outPath}`);

// ============================================================================
// Helpers
// ============================================================================

/**
 * Extract a single-quoted, double-quoted, or backtick-quoted string value for
 * the given Dart field name within a block. Returns `null` if not found.
 *
 * Handles:
 *   name: 'JSON Formatter',
 *   description: "Convert JSON ...",
 *   route: AppRoutes.jsonFormatter,        ← returns "jsonFormatter" (no quotes)
 *
 * @param {string} block
 * @param {string} field
 * @returns {string | null}
 */
function extractString(block, field) {
  // Quoted value (handles escaped quotes inside). Character class matches
  // single quote, double quote, or backtick.
  const quoteClass = "['\"`]";
  const quoted = new RegExp(
    `${field}\\s*:\\s*(${quoteClass})((?:\\\\.|(?!\\1).)*)\\1`,
  );
  const qm = block.match(quoted);
  if (qm) {
    const unescapeRe = new RegExp(`\\\\(${quoteClass})`, "g");
    return qm[2].replace(unescapeRe, "$1");
  }
  // Unquoted identifier (e.g. `route: AppRoutes.foo`).
  const ident = new RegExp(`${field}\\s*:\\s*([A-Za-z_][\\w.]*)`);
  const im = block.match(ident);
  if (im) {
    // Return only the last segment (the constant name).
    const lastDot = im[1].lastIndexOf(".");
    return lastDot === -1 ? im[1] : im[1].slice(lastDot + 1);
  }
  return null;
}

/**
 * Extract a boolean value for the given field. Returns `false` if not found.
 *
 * @param {string} block
 * @param {string} field
 * @returns {boolean}
 */
function extractBool(block, field) {
  const m = block.match(new RegExp(`${field}\\s*:\\s*(true|false)`));
  return m ? m[1] === "true" : false;
}

/**
 * Extract a Dart list of strings (single- or double-quoted) for the given
 * field. Returns `[]` if not found.
 *
 * Handles:
 *   keywords: ['json', "csv", 'convert']
 *
 * @param {string} block
 * @param {string} field
 * @returns {string[]}
 */
function extractList(block, field) {
  const listMatch = block.match(
    new RegExp(`${field}\\s*:\\s*\\[([\\s\\S]*?)\\]`),
  );
  if (!listMatch) return [];
  const inner = listMatch[1];
  const items = [];
  const quoteClass = "['\"`]";
  const itemRe = new RegExp(`${quoteClass}((?:\\\\.|(?!${quoteClass}).)*)${quoteClass}`, "g");
  for (const itemMatch of inner.matchAll(itemRe)) {
    const unescapeRe = new RegExp(`\\\\(${quoteClass})`, "g");
    items.push(itemMatch[1].replace(unescapeRe, "$1"));
  }
  return items;
}

/**
 * Build a `devtpro://` URL for a given Flutter route path.
 * Mirrors `DeepLinkRouter.buildUri` in the Flutter app.
 *
 *   /formatters/json          → devtpro://formatters/json
 *   /encoders_decoders/jwt    → devtpro://encoders_decoders/jwt
 *
 * @param {string} route
 * @returns {string}
 */
function buildDeepLink(route) {
  const trimmed = route.startsWith("/") ? route.slice(1) : route;
  const parts = trimmed.split("/").filter(Boolean);
  if (parts.length === 0) return "devtpro://";
  const host = parts[0];
  const pathSegments = parts.slice(1);
  const path = pathSegments.length > 0 ? "/" + pathSegments.join("/") : "";
  return `devtpro://${host}${path}`;
}

// ============================================================================
// Icon mapping
// ============================================================================

/**
 * Maps a Dart icon identifier (e.g. "Symbols.data_object", "Icons.code") to
 * the closest Raycast Icon enum name.
 *
 * Falls back to a tool-name-based override (for "destination" tools whose
 * Dart icon represents the source format), and finally to a sensible
 * category-based default.
 *
 * @param {string | null} dartIcon
 * @param {string} toolName
 * @param {string} category
 * @returns {string} a Raycast `Icon.*` enum name (without the `Icon.` prefix)
 */
function mapIcon(dartIcon, toolName, category) {
  // Strip "Symbols." or "Icons." prefix, keep the icon name.
  const symbol = dartIcon ? dartIcon.split(".").pop() : null;

  // --- 1. Source-format overrides ---
  // Assign icons based on the *input* format so tools sharing the same
  // source type have a common icon, regardless of what they convert into.
  if (/^JSON\b/i.test(toolName)) return "CodeBlock";
  if (/^XML\b/i.test(toolName)) return "Code";
  if (/^YAML\b/i.test(toolName)) return "Document";
  if (/^CSV\b/i.test(toolName)) return "List";
  if (/^TSV\b/i.test(toolName)) return "List";
  if (/^TOML\b/i.test(toolName)) return "Cog";
  if (/^TOON\b/i.test(toolName)) return "ComputerChip";
  if (/^cURL\b/i.test(toolName)) return "Terminal";

  // --- 1b. Specific tool overrides ---
  if (/Number Format/i.test(toolName)) return "Calculator";
  if (/Hash Generator/i.test(toolName)) return "Fingerprint";
  if (/HTML Preview/i.test(toolName)) return "Eye";

  // --- 2. Direct symbol → Raycast icon mapping ---
  const SYMBOL_MAP = {
    // JSON
    data_object: "CodeBlock",
    data_array: "Snippets",

    // XML / code
    code: "Code",
    code_blocks: "CodeBlock",

    // YAML
    description: "Document",

    // TOON
    memory: "ComputerChip",

    // CSV / TSV
    csv: "List",
    tsv: "List",
    table: "List",
    table_view: "List",
    table_chart: "List",

    // TOML
    list_alt: "List",
    list: "List",

    // URL / network
    link: "Link",
    link_off: "Link",
    travel_explore: "Globe",
    public: "Globe",
    language: "Globe",
    http: "Globe",

    // Base64 / encryption
    encrypted: "Lock",
    encryption: "Lock",
    lock: "Lock",
    lock_open: "LockUnlocked",
    lock_outline: "Lock",
    password: "Key",
    key: "Key",
    vpn_key: "Key",
    security: "Shield",
    shield: "Shield",
    fingerprint: "Fingerprint",
    tag: "Tag",

    // Files / data
    upload_file: "Upload",
    file_upload: "Upload",
    download: "Download",
    file_download: "Download",
    save: "SaveDocument",
    save_alt: "SaveDocument",
    delete: "Trash",
    file_copy: "CopyClipboard",
    content_copy: "CopyClipboard",
    content_paste: "Clipboard",

    // Text
    text_format: "Text",
    text_fields: "Text",
    text_snippet: "Document",
    notes: "Document",
    subject: "Document",
    article: "Document",
    difference: "TextCursor",
    compare_arrows: "ArrowRight",
    swap_horiz: "ArrowRight",
    translate: "Text",

    // Formatters
    format_align_left: "AlignLeft",
    format_align_center: "AlignCentre",
    format_align_right: "AlignRight",
    format_quote: "QuoteBlock",
    format_clear: "ClearFormatting",
    format_paint: "Brush",
    format_size: "Text",
    style: "Text",

    // Markdown / HTML
    markdown: "Text",
    html: "CodeBlock",

    // Time / date
    schedule: "Clock",
    access_time: "Clock",
    access_time_filled: "Clock",
    timer: "Stopwatch",
    hourglass_empty: "Hourglass",
    hourglass_full: "Hourglass",
    today: "Calendar",
    calendar_today: "Calendar",
    calendar_month: "Calendar",
    edit_calendar: "Calendar",
    event: "Calendar",
    date_range: "Calendar",
    update: "ArrowClockwise",
    history: "ArrowCounterClockwise",
    restore: "ArrowCounterClockwise",

    // Search / verify
    search: "MagnifyingGlass",
    find_in_page: "MagnifyingGlass",
    fact_check: "CheckRosette",
    verified: "CheckRosette",
    check_circle: "CheckCircle",
    task_alt: "CheckCircle",
    rule: "CheckList",
    bug_report: "Bug",

    // Numbers / units
    numbers: "Hashtag",
    pin: "Pin",
    push_pin: "Pin",
    calculate: "Calculator",
    function: "Calculator",
    percent: "Hashtag",
    straighten: "Ruler",
    square_foot: "Ruler",
    speed: "Gauge",
    gauge: "Gauge",
    monitoring: "BarChart",
    bar_chart: "BarChart",
    analytics: "BarChart",
    insights: "BarChart",
    trending_up: "LineChart",
    show_chart: "LineChart",

    // Color / image
    palette: "Swatch",
    color_lens: "Swatch",
    brush: "Brush",
    paint: "Brush",
    image: "Image",
    photo: "Image",
    picture_as_pdf: "Document",
    visibility: "Eye",
    eye: "Eye",

    // QR / barcode
    qr_code: "BarCode",
    qr_code_scanner: "BarCode",
    barcode: "BarCode",
    scan: "MagnifyingGlass",

    // Settings / misc
    settings: "Gear",
    preferences: "Gear",
    tune: "Gear",
    build: "WrenchScrewdriver",
    construction: "WrenchScrewdriver",
    handyman: "WrenchScrewdriver",
    keyboard: "Keyboard",
    terminal: "Terminal",
    memory_alt: "ComputerChip",
    storage: "HardDrive",
    sd_storage: "HardDrive",
    cloud: "Cloud",
    cloud_upload: "Cloud",
    cloud_download: "Cloud",
    database: "HardDrive",
    dns: "Globe",
    server: "HardDrive",

    // Generic/format
    info: "Info",
    info_outline: "Info",
    help: "QuestionMark",
    help_outline: "QuestionMark",
    warning: "Warning",
    error: "Warning",
    lightbulb: "LightBulb",
    tips_and_updates: "LightBulb",
    star: "Star",
    favorite: "Heart",
    bookmark: "Bookmark",
    flag: "Flag",
    bolt: "Bolt",
    flash_on: "Bolt",
    rocket: "Rocket",
    rocket_launch: "Rocket",
    science: "Brush",
    psychology: "LightBulb",
  };

  if (symbol && SYMBOL_MAP[symbol]) return SYMBOL_MAP[symbol];

  // --- 3. Category-based fallbacks ---
  const CATEGORY_MAP = {
    Converters: "ArrowRight",
    "Code Converters": "Code",
    Formatters: "AlignLeft",
    "Encoders/Decoders": "Lock",
    Validators: "CheckCircle",
    Minifiers: "Compress",
    Viewers: "Eye",
    Previewers: "Eye",
    Cryptography: "Key",
    "DateTime Utilities": "Clock",
    Utilities: "WrenchScrewdriver",
    "QR Code": "BarCode",
    Settings: "Gear",
  };

  return CATEGORY_MAP[category] || "Circle";
}
