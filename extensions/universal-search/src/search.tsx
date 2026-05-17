import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  Image,
  List,
  LocalStorage,
  Toast,
  confirmAlert,
  environment,
  getPreferenceValues,
  open,
  showInFinder,
  showToast,
  trash,
} from "@raycast/api";
import { spawn } from "child_process";
import { createHash } from "crypto";
import { existsSync } from "fs";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Preferences, ResultKind, SearchResult, SourceContext, SourceOutput } from "./types";
import { rewriteObsidianMarkdown, searchObsidian } from "./sources/obsidian";
import {
  fileToImageDataUrl,
  pdfToImageDataUrl,
  quickLookThumbnailToImageDataUrl,
  resizeJpegBase64ToDataUrl,
  videoToImageDataUrl,
} from "./sources/images";
import { getBookmarkError, removeSafariBookmark, searchBookmarks } from "./sources/bookmarks";
import { searchFileContents, searchFileNames, searchFolders } from "./sources/spotlight";
import { deleteContact, getContactsError, searchContacts } from "./sources/contacts";
import { getCalendarError, searchEvents } from "./sources/calendar";
import { searchApplications } from "./sources/applications";
import { getPhotosError, searchPhotos } from "./sources/photos";
import { searchScriptCommands } from "./sources/scripts";
import { parquetPreviewMarkdown } from "./sources/parquet";
import {
  parseList,
  parsePathExcludes,
  parsePathExcludesRelativeTo,
  parseQuery,
  shortenPath,
  tildify,
  untildify,
} from "./sources/util";

const KIND_META: Record<ResultKind, { label: string; section: string; color: Color; icon: Icon }> = {
  "file-content": { label: "CONTENT", section: "File Contents", color: Color.Green, icon: Icon.MagnifyingGlass },
  file: { label: "FILE", section: "File Names", color: Color.Blue, icon: Icon.Document },
  folder: { label: "FOLDER", section: "Folders", color: Color.Yellow, icon: Icon.Folder },
  note: { label: "NOTE", section: "Obsidian Vault", color: Color.Purple, icon: Icon.Pencil },
  bookmark: { label: "BOOKMARK", section: "Safari Bookmarks", color: Color.Orange, icon: Icon.Bookmark },
  contact: { label: "CONTACT", section: "Contacts", color: Color.Magenta, icon: Icon.Person },
  event: { label: "EVENT", section: "Calendar", color: Color.Red, icon: Icon.Calendar },
  application: { label: "APP", section: "Applications", color: Color.PrimaryText, icon: Icon.AppWindow },
  photo: { label: "PHOTO", section: "Photos", color: Color.Green, icon: Icon.Image },
  "script-command": { label: "SCRIPT", section: "Script Commands", color: Color.PrimaryText, icon: Icon.Terminal },
};

const DEFAULT_SECTION_ORDER: ResultKind[] = [
  "application",
  "script-command",
  "file-content",
  "file",
  "folder",
  "note",
  "bookmark",
  "contact",
  "event",
  "photo",
];

function parseSectionOrder(raw?: string): ResultKind[] {
  if (!raw) return DEFAULT_SECTION_ORDER;
  const valid = new Set<ResultKind>(DEFAULT_SECTION_ORDER);
  const seen = new Set<ResultKind>();
  const order: ResultKind[] = [];
  for (const token of raw.split(",").map((s) => s.trim().toLowerCase())) {
    if (valid.has(token as ResultKind) && !seen.has(token as ResultKind)) {
      order.push(token as ResultKind);
      seen.add(token as ResultKind);
    }
  }
  for (const k of DEFAULT_SECTION_ORDER) if (!seen.has(k)) order.push(k);
  return order;
}

function parsePriority(raw: string | undefined, fallback: number): number {
  if (!raw?.trim()) return fallback;
  const n = Number(raw.trim());
  return Number.isFinite(n) ? n : fallback;
}

function sectionOrderFromPreferences(prefs: Preferences): ResultKind[] {
  const legacyOrder = parseSectionOrder(prefs.sectionOrder);
  const legacyRank = new Map<ResultKind, number>(legacyOrder.map((kind, index) => [kind, index]));
  const priorities: Record<ResultKind, number> = {
    application: parsePriority(prefs.priorityApplications, 1),
    "script-command": parsePriority(prefs.priorityScriptCommands, 2),
    "file-content": parsePriority(prefs.priorityFileContents, 3),
    file: parsePriority(prefs.priorityFileNames, 4),
    folder: parsePriority(prefs.priorityFolders, 5),
    note: parsePriority(prefs.priorityObsidian, 6),
    bookmark: parsePriority(prefs.priorityBookmarks, 7),
    contact: parsePriority(prefs.priorityContacts, 8),
    event: parsePriority(prefs.priorityEvents, 9),
    photo: parsePriority(prefs.priorityPhotos, 10),
  };

  return [...DEFAULT_SECTION_ORDER].sort(
    (a, b) => priorities[a] - priorities[b] || (legacyRank.get(a) ?? 0) - (legacyRank.get(b) ?? 0),
  );
}

function formatSize(bytes?: number): string {
  if (bytes === undefined) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

function formatTime(ms?: number): string {
  if (!ms) return "—";
  const d = new Date(ms);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  if (sameDay) {
    return `Today, ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  }
  return d.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const TEXT_EXT_RE =
  /\.(txt|md|markdown|py|ts|tsx|js|jsx|json|yaml|yml|toml|html|css|scss|sass|sh|bash|zsh|fish|go|rs|java|kt|swift|c|cpp|h|hpp|sql|rb|php|xml|csv|log|conf|ini|env|gitignore|tf|tfvars|lua|r|m|mm|vue|svelte)$/i;
const IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|bmp|svg|heic|heif)$/i;
const VIDEO_EXT_RE = /\.(mp4|m4v|mov|avi|mkv|webm)$/i;
const DOCUMENT_EXT_RE = /\.(docx|xlsx|pptx)$/i;
const PARQUET_EXT_RE = /\.parquet$/i;
const MAX_PREVIEW_BYTES = 32_000;
const SKIP_PREVIEW_BYTES = 2_000_000;
const MAX_PREVIEW_LINE_CHARS = 400;
const MAX_PREVIEW_LINES = 400;
const MAX_MERMAID_SOURCE_CHARS = 20_000;
const RECENT_RESULTS_KEY = "recent-results-v1";
const MAX_STORED_RECENTS = 100;
const FULL_DISK_ACCESS_SETTINGS_URL = "x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles";

type RecentSearchResult = SearchResult & {
  lastOpenedAt: number;
  openCount: number;
};

function parseCount(raw: string | undefined, fallback: number): number {
  const n = parseInt(raw || "", 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function parseOptionalCount(raw: string | undefined, fallback: number): number {
  if (!raw?.trim()) return fallback;
  return parseCount(raw, fallback);
}

function sourceLimitsFromPreferences(prefs: Preferences, fallback: number): Record<ResultKind, number> {
  return {
    application: parseOptionalCount(prefs.maxApplications, fallback),
    "script-command": parseOptionalCount(prefs.maxScriptCommands, fallback),
    "file-content": parseOptionalCount(prefs.maxFileContents, fallback),
    file: parseOptionalCount(prefs.maxFileNames, fallback),
    folder: parseOptionalCount(prefs.maxFolders, fallback),
    note: parseOptionalCount(prefs.maxObsidian, fallback),
    bookmark: parseOptionalCount(prefs.maxBookmarks, fallback),
    contact: parseOptionalCount(prefs.maxContacts, fallback),
    event: parseOptionalCount(prefs.maxEvents, fallback),
    photo: parseOptionalCount(prefs.maxPhotos, fallback),
  };
}

function recentKey(r: SearchResult): string {
  return resultStorageKey(r);
}

function resultStorageKey(r: SearchResult): string {
  return `${r.kind}:${(r.path ?? r.url ?? r.id).toLowerCase()}`;
}

function canTrashResult(r: SearchResult): boolean {
  return !!r.path && (r.kind === "note" || r.kind === "file" || r.kind === "file-content");
}

function canUsePreviewIcon(r: SearchResult): boolean {
  return r.kind === "contact" && !!r.imageBase64;
}

function cleanResultForRecent(r: SearchResult): SearchResult {
  return {
    id: r.id,
    kind: r.kind,
    title: r.title,
    subtitle: r.subtitle,
    path: r.path,
    url: r.url,
    matchPreview: r.matchPreview,
    matchLine: r.matchLine,
    modifiedAt: r.modifiedAt,
    size: r.size,
    emails: r.emails,
    phones: r.phones,
    imageBase64: r.imageBase64,
    eventStart: r.eventStart,
    eventEnd: r.eventEnd,
    location: r.location,
    calendar: r.calendar,
    photoIdentifier: r.photoIdentifier,
    photoWidth: r.photoWidth,
    photoHeight: r.photoHeight,
    photoCreatedAt: r.photoCreatedAt,
    scriptMode: r.scriptMode,
    scriptPackageName: r.scriptPackageName,
    scriptDescription: r.scriptDescription,
    scriptSchemaVersion: r.scriptSchemaVersion,
    scriptArgumentCount: r.scriptArgumentCount,
  };
}

function sortRecents(items: RecentSearchResult[]): RecentSearchResult[] {
  return [...items].sort((a, b) => b.lastOpenedAt - a.lastOpenedAt || b.openCount - a.openCount);
}

async function loadRecentResults(): Promise<RecentSearchResult[]> {
  try {
    const raw = await LocalStorage.getItem<string>(RECENT_RESULTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const fs = await import("fs/promises");
    const valid: RecentSearchResult[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object" || typeof item.id !== "string" || typeof item.kind !== "string") continue;
      if (item.path) {
        try {
          await fs.access(item.path);
        } catch {
          continue;
        }
      }
      valid.push(item as RecentSearchResult);
    }
    return sortRecents(valid).slice(0, MAX_STORED_RECENTS);
  } catch {
    return [];
  }
}

async function saveRecentResults(items: RecentSearchResult[]) {
  await LocalStorage.setItem(RECENT_RESULTS_KEY, JSON.stringify(sortRecents(items).slice(0, MAX_STORED_RECENTS)));
}

async function showPhotosPermissionAlert() {
  const shouldOpenSettings = await confirmAlert({
    icon: Icon.Image,
    title: "Full Disk Access Required",
    message:
      "Raycast cannot be added to Photos access from an extension. Grant Raycast Full Disk Access so Universal Search can read the local Photos library database.",
    primaryAction: { title: "Open Full Disk Access" },
    dismissAction: {
      title: "Cancel",
      style: Alert.ActionStyle.Cancel,
    },
  });
  if (shouldOpenSettings) await open(FULL_DISK_ACCESS_SETTINGS_URL);
}

function clipForRendering(text: string, escapeFences = true): string {
  // Escape triple backticks only for previews wrapped in a synthetic code fence.
  const safe = escapeFences ? text.replace(/```/g, "``​`") : text;
  const lines = safe.split("\n");
  const out: string[] = [];
  for (let i = 0; i < Math.min(lines.length, MAX_PREVIEW_LINES); i++) {
    const l = lines[i];
    out.push(l.length > MAX_PREVIEW_LINE_CHARS ? l.slice(0, MAX_PREVIEW_LINE_CHARS) + " …[line truncated]" : l);
  }
  if (lines.length > MAX_PREVIEW_LINES) {
    out.push(`…[${lines.length - MAX_PREVIEW_LINES} more lines truncated]`);
  }
  return out.join("\n");
}

function langFromExt(p: string): string {
  const ext = (p.match(/\.([^.]+)$/)?.[1] || "").toLowerCase();
  const map: Record<string, string> = {
    md: "markdown",
    markdown: "markdown",
    py: "python",
    ts: "typescript",
    tsx: "tsx",
    js: "javascript",
    jsx: "jsx",
    yml: "yaml",
    sh: "bash",
    bash: "bash",
    zsh: "bash",
    rs: "rust",
    rb: "ruby",
    kt: "kotlin",
    m: "objectivec",
    mm: "objectivec",
  };
  return map[ext] ?? ext;
}

type ErEntity = { name: string; fields: string[] };
type ErRelationship = { from: string; to: string; label: string; inactive: boolean };
type PieSlice = { label: string; value: number };
type FlowNode = { id: string; label: string };
type FlowGroup = { id: string; label: string; nodes: FlowNode[]; groups: FlowGroup[] };
type MermaidApi = {
  initialize: (config: Record<string, unknown>) => void;
  render: (id: string, source: string) => Promise<{ svg: string }>;
};
type DomPurifyFactory = (window: Window) => { sanitize: (dirty: string, config?: Record<string, unknown>) => string };

function xmlEscape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

let mermaidApiPromise: Promise<MermaidApi> | null = null;

async function getMermaidApi(): Promise<MermaidApi> {
  if (mermaidApiPromise) return mermaidApiPromise;
  mermaidApiPromise = (async () => {
    const { JSDOM } = await (Function("return import('jsdom')")() as Promise<typeof import("jsdom")>);
    const dom = new JSDOM("<!doctype html><html><body></body></html>");
    const globalObject = globalThis as typeof globalThis & Record<string, unknown>;
    globalObject.window = dom.window;
    globalObject.document = dom.window.document;
    Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
    Object.defineProperty(globalThis, "screen", {
      value: { width: 1200, height: 900, availWidth: 1200, availHeight: 900 },
      configurable: true,
    });
    globalObject.Element = dom.window.Element;
    globalObject.HTMLElement = dom.window.HTMLElement;
    globalObject.SVGElement = dom.window.SVGElement;
    globalObject.HTMLCanvasElement = dom.window.HTMLCanvasElement;
    globalObject.Node = dom.window.Node;
    globalObject.CSSStyleSheet = class {
      cssRules: Array<{ cssText: string }> = [];
      replaceSync() {
        this.cssRules = [];
      }
      insertRule(rule: string) {
        this.cssRules.push({ cssText: rule });
        return this.cssRules.length - 1;
      }
    };
    dom.window.SVGElement.prototype.getBBox = function getBBox() {
      const text = this.textContent ?? "";
      return { x: 0, y: 0, width: Math.max(24, text.length * 8), height: 18 };
    };
    dom.window.SVGElement.prototype.getComputedTextLength = function getComputedTextLength() {
      return Math.max(24, (this.textContent ?? "").length * 8);
    };
    dom.window.HTMLCanvasElement.prototype.getContext = function getContext() {
      const context = {
        canvas: this,
        measureText: (text: string) => ({ width: Math.max(1, text.length * 8) }),
      };
      return new Proxy(context, {
        get(target, prop) {
          if (prop in target) return target[prop as keyof typeof target];
          return () => undefined;
        },
        set(target, prop, value) {
          (target as Record<PropertyKey, unknown>)[prop] = value;
          return true;
        },
      });
    };

    const domPurifyModule = await (Function("return import('dompurify')")() as Promise<{ default: DomPurifyFactory }>);
    globalObject.DOMPurify = domPurifyModule.default(dom.window);
    const mermaidModule = await (Function("return import('mermaid')")() as Promise<{ default: MermaidApi }>);

    const mermaid = mermaidModule.default;
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "loose",
      theme: "base",
      fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    });
    return mermaid;
  })();
  return mermaidApiPromise;
}

function truncateSvgText(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, Math.max(0, max - 1)) + "…";
}

function parseErDiagram(source: string): { entities: ErEntity[]; relationships: ErRelationship[] } | undefined {
  const lines = source.split(/\r?\n/);
  if (!lines.some((line) => line.trim() === "erDiagram")) return undefined;

  const entities: ErEntity[] = [];
  const relationships: ErRelationship[] = [];
  let current: ErEntity | undefined;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("%%") || trimmed === "erDiagram") continue;
    const entityStart = trimmed.match(/^([A-Za-z0-9_-]+)\s+\{$/);
    if (entityStart) {
      current = { name: entityStart[1], fields: [] };
      entities.push(current);
      continue;
    }
    if (trimmed === "}") {
      current = undefined;
      continue;
    }
    if (current) {
      current.fields.push(trimmed.replace(/\s+/g, " "));
      continue;
    }
    const relationship = trimmed.match(/^([A-Za-z0-9_-]+)\s+([-|}{o.]+)\s+([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (relationship) {
      relationships.push({
        from: relationship[1],
        to: relationship[3],
        label: relationship[4].replace(/^"|"$/g, ""),
        inactive: relationship[2].includes(".."),
      });
    }
  }

  return entities.length > 0 ? { entities, relationships } : undefined;
}

function renderErDiagramSvg(source: string): string | undefined {
  const diagram = parseErDiagram(source);
  if (!diagram) return undefined;

  const cardWidth = 300;
  const headerHeight = 34;
  const fieldHeight = 18;
  const horizontalGap = 34;
  const verticalGap = 42;
  const columns = Math.min(4, Math.max(1, Math.ceil(Math.sqrt(diagram.entities.length * 1.4))));
  const positions = new Map<string, { x: number; y: number; width: number; height: number }>();
  const entityHeights = diagram.entities.map((entity) => {
    const fieldCount = Math.min(entity.fields.length, 13);
    return headerHeight + 18 + fieldCount * fieldHeight + (entity.fields.length > fieldCount ? fieldHeight : 0);
  });
  const rows = Math.ceil(diagram.entities.length / columns);
  const rowHeights = Array.from({ length: rows }, (_unused, row) =>
    Math.max(...entityHeights.slice(row * columns, row * columns + columns)),
  );
  const rowTops = rowHeights.map((_, row) => {
    return 24 + rowHeights.slice(0, row).reduce((sum, rowHeight) => sum + rowHeight + verticalGap, 0);
  });

  diagram.entities.forEach((entity, index) => {
    const row = Math.floor(index / columns);
    const col = index % columns;
    positions.set(entity.name, {
      x: 24 + col * (cardWidth + horizontalGap),
      y: rowTops[row],
      width: cardWidth,
      height: entityHeights[index],
    });
  });

  const width = 48 + columns * cardWidth + (columns - 1) * horizontalGap;
  const height = Math.max(
    180,
    48 + rowHeights.reduce((sum, rowHeight, row) => sum + rowHeight + (row < rows - 1 ? verticalGap : 0), 0),
  );

  const relationshipLines = diagram.relationships
    .map((relationship, index) => {
      const from = positions.get(relationship.from);
      const to = positions.get(relationship.to);
      if (!from || !to) return "";
      const x1 = from.x + from.width / 2;
      const y1 = from.y + from.height / 2;
      const x2 = to.x + to.width / 2;
      const y2 = to.y + to.height / 2;
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      const dash = relationship.inactive ? ` stroke-dasharray="7 6"` : "";
      const labelOffset = index % 2 === 0 ? -7 : 15;
      return `<g><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#94a3b8" stroke-width="1.5"${dash}/><text x="${midX}" y="${midY + labelOffset}" text-anchor="middle" font-size="10" fill="#475569">${xmlEscape(truncateSvgText(relationship.label, 34))}</text></g>`;
    })
    .join("");

  const cards = diagram.entities
    .map((entity) => {
      const pos = positions.get(entity.name)!;
      const shownFields = entity.fields.slice(0, 13);
      const hiddenCount = entity.fields.length - shownFields.length;
      const fields = shownFields
        .map((field, index) => {
          const y = pos.y + headerHeight + 23 + index * fieldHeight;
          const isKey = /\b(PK|FK)\b/.test(field);
          return `<text x="${pos.x + 12}" y="${y}" font-size="11" fill="${isKey ? "#0f766e" : "#334155"}">${xmlEscape(truncateSvgText(field, 42))}</text>`;
        })
        .join("");
      const more =
        hiddenCount > 0
          ? `<text x="${pos.x + 12}" y="${pos.y + headerHeight + 23 + shownFields.length * fieldHeight}" font-size="11" fill="#64748b">+ ${hiddenCount} more fields</text>`
          : "";
      return `<g><rect x="${pos.x}" y="${pos.y}" width="${pos.width}" height="${pos.height}" rx="6" fill="#ffffff" stroke="#cbd5e1"/><rect x="${pos.x}" y="${pos.y}" width="${pos.width}" height="${headerHeight}" rx="6" fill="#0f172a"/><text x="${pos.x + 12}" y="${pos.y + 22}" font-size="13" font-weight="700" fill="#ffffff">${xmlEscape(truncateSvgText(entity.name, 34))}</text>${fields}${more}</g>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#f8fafc"/>${relationshipLines}${cards}</svg>`;
}

function polarToCartesian(cx: number, cy: number, radius: number, angle: number): { x: number; y: number } {
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  };
}

function pieSlicePath(cx: number, cy: number, radius: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, radius, startAngle);
  const end = polarToCartesian(cx, cy, radius, endAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
}

function parsePieDiagram(source: string): { title: string; slices: PieSlice[] } | undefined {
  const lines = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("%%"));
  if (lines.length === 0 || !/^pie\b/i.test(lines[0])) return undefined;

  let title = "Pie Chart";
  const firstLineTitle = lines[0].match(/^pie\s+title\s+(.+)$/i);
  if (firstLineTitle) title = firstLineTitle[1].trim();

  const slices: PieSlice[] = [];
  for (const line of lines.slice(1)) {
    const titleLine = line.match(/^title\s+(.+)$/i);
    if (titleLine) {
      title = titleLine[1].trim();
      continue;
    }
    const slice = line.match(/^["“](.+?)["”]\s*:\s*([0-9]+(?:\.[0-9]+)?)$/);
    if (slice) slices.push({ label: slice[1], value: Number(slice[2]) });
  }

  return slices.some((slice) => slice.value > 0) ? { title, slices } : undefined;
}

function parseFlowLabel(raw: string): string {
  const bracket = raw.match(/\[\s*"([^"]+)"\s*\]/) ?? raw.match(/\[\s*([^\]]+)\s*\]/);
  return (bracket?.[1] ?? raw).replace(/^"|"$/g, "").trim();
}

function cleanFlowLabel(label: string): string {
  return label
    .replace(/\bfa:fa-[a-z0-9-]+\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseFlowchartDiagram(source: string): FlowGroup | undefined {
  const lines = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("%%"));
  const start = lines.findIndex((line) => /^(flowchart|graph)\b/i.test(line));
  if (start < 0) return undefined;

  const root: FlowGroup = { id: "root", label: "Flowchart", nodes: [], groups: [] };
  const stack: FlowGroup[] = [root];

  for (const line of lines.slice(start + 1)) {
    if (/^direction\b/i.test(line)) continue;
    if (line === "end") {
      if (stack.length > 1) stack.pop();
      continue;
    }

    const subgraph = line.match(/^subgraph\s+([A-Za-z0-9_-]+)(?:\s*(.+))?$/i);
    if (subgraph) {
      const group: FlowGroup = {
        id: subgraph[1],
        label: cleanFlowLabel(parseFlowLabel(subgraph[2] || subgraph[1])),
        nodes: [],
        groups: [],
      };
      stack[stack.length - 1].groups.push(group);
      stack.push(group);
      continue;
    }

    const node = line.match(/^([A-Za-z0-9_-]+)\s*(\[[\s\S]+\])$/);
    if (node) {
      stack[stack.length - 1].nodes.push({
        id: node[1],
        label: cleanFlowLabel(parseFlowLabel(node[2])),
      });
    }
  }

  return root.nodes.length > 0 || root.groups.length > 0 ? root : undefined;
}

function measureFlowGroup(group: FlowGroup): { width: number; height: number } {
  const nodeHeight = 44;
  const gap = 14;
  const padding = 22;
  const labelWidth = group.label.length * 8 + 48;
  const childSizes = [
    ...group.groups.map(measureFlowGroup),
    ...group.nodes.map((node) => ({
      width: Math.max(150, Math.min(260, node.label.length * 8 + 36)),
      height: nodeHeight,
    })),
  ];
  if (childSizes.length === 0) return { width: Math.max(180, labelWidth), height: 76 };
  const width = Math.max(labelWidth, ...childSizes.map((size) => size.width)) + padding * 2;
  const height = 46 + childSizes.reduce((sum, size) => sum + size.height, 0) + gap * (childSizes.length - 1) + padding;
  return { width, height };
}

function renderFlowGroup(group: FlowGroup, x: number, y: number, root = false): string {
  const size = measureFlowGroup(group);
  const gap = 14;
  const pieces: string[] = [];
  if (!root) {
    pieces.push(
      `<rect x="${x}" y="${y}" width="${size.width}" height="${size.height}" rx="8" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5"/>`,
      `<text x="${x + 16}" y="${y + 28}" font-size="14" font-weight="700" fill="#0f172a">${xmlEscape(truncateSvgText(group.label, 52))}</text>`,
    );
  }

  let cursorY = y + (root ? 0 : 46);
  for (const child of group.groups) {
    const childSize = measureFlowGroup(child);
    const childX = x + (size.width - childSize.width) / 2;
    pieces.push(renderFlowGroup(child, childX, cursorY));
    cursorY += childSize.height + gap;
  }
  for (const node of group.nodes) {
    const nodeWidth = Math.max(150, Math.min(260, node.label.length * 8 + 36));
    const nodeX = x + (size.width - nodeWidth) / 2;
    pieces.push(
      `<rect x="${nodeX}" y="${cursorY}" width="${nodeWidth}" height="44" rx="7" fill="#eff6ff" stroke="#93c5fd"/>`,
      `<text x="${nodeX + nodeWidth / 2}" y="${cursorY + 27}" text-anchor="middle" font-size="13" font-weight="600" fill="#1e3a8a">${xmlEscape(truncateSvgText(node.label, 30))}</text>`,
    );
    cursorY += 44 + gap;
  }
  return pieces.join("");
}

function renderFlowchartSvg(source: string): string | undefined {
  const diagram = parseFlowchartDiagram(source);
  if (!diagram) return undefined;
  const contentSizes = [
    ...diagram.groups.map(measureFlowGroup),
    ...diagram.nodes.map((node) => ({
      width: Math.max(150, Math.min(260, node.label.length * 8 + 36)),
      height: 44,
    })),
  ];
  const width = Math.max(360, 48 + Math.max(...contentSizes.map((size) => size.width), 0));
  const height = Math.max(180, 48 + contentSizes.reduce((sum, size) => sum + size.height + 14, 0));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#f8fafc"/>${renderFlowGroup(diagram, 24, 24, true)}</svg>`;
}

function renderPieDiagramSvg(source: string): string | undefined {
  const diagram = parsePieDiagram(source);
  if (!diagram) return undefined;

  const colors = ["#2563eb", "#dc2626", "#16a34a", "#d97706", "#7c3aed", "#0891b2", "#be123c", "#4d7c0f"];
  const width = 760;
  const height = 430;
  const cx = 230;
  const cy = 230;
  const radius = 135;
  const total = diagram.slices.reduce((sum, slice) => sum + Math.max(0, slice.value), 0);
  let angle = -Math.PI / 2;

  const slices = diagram.slices
    .map((slice, index) => {
      const value = Math.max(0, slice.value);
      const nextAngle = angle + (value / total) * Math.PI * 2;
      const midAngle = (angle + nextAngle) / 2;
      const labelPoint = polarToCartesian(cx, cy, radius * 0.65, midAngle);
      const percentage = Math.round((value / total) * 100);
      const path = pieSlicePath(cx, cy, radius, angle, nextAngle);
      angle = nextAngle;
      return `<g><path d="${path}" fill="${colors[index % colors.length]}" stroke="#ffffff" stroke-width="2"/><text x="${labelPoint.x}" y="${labelPoint.y}" text-anchor="middle" dominant-baseline="middle" font-size="16" font-weight="700" fill="#ffffff">${percentage}%</text></g>`;
    })
    .join("");

  const legend = diagram.slices
    .map((slice, index) => {
      const y = 150 + index * 34;
      const percentage = Math.round((slice.value / total) * 100);
      return `<g><rect x="440" y="${y - 12}" width="16" height="16" rx="3" fill="${colors[index % colors.length]}"/><text x="468" y="${y}" font-size="15" fill="#0f172a">${xmlEscape(truncateSvgText(slice.label, 30))}</text><text x="700" y="${y}" text-anchor="end" font-size="15" font-weight="700" fill="#334155">${slice.value} (${percentage}%)</text></g>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#f8fafc"/><text x="32" y="48" font-size="24" font-weight="700" fill="#0f172a">${xmlEscape(truncateSvgText(diagram.title, 46))}</text>${slices}<circle cx="${cx}" cy="${cy}" r="54" fill="#f8fafc"/><text x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="17" font-weight="700" fill="#0f172a">Total</text><text x="${cx}" y="${cy + 20}" text-anchor="middle" font-size="15" fill="#475569">${total}</text>${legend}</svg>`;
}

async function renderMermaidSvg(source: string): Promise<string | undefined> {
  try {
    const mermaid = await getMermaidApi();
    const id = `us-mermaid-${createHash("sha1").update(source).digest("hex").slice(0, 12)}`;
    const { svg } = await mermaid.render(id, source);
    if (svg.trim()) return svg;
  } catch (e) {
    console.error("[universal-search/mermaid]", e);
  }
  return renderErDiagramSvg(source) ?? renderPieDiagramSvg(source) ?? renderFlowchartSvg(source);
}

async function writeMermaidSvg(svg: string, source: string): Promise<string> {
  const dir = path.join(environment.supportPath, "mermaid-preview");
  await mkdir(dir, { recursive: true });
  const hash = createHash("sha1").update(source).update(svg).digest("hex");
  const svgPath = path.join(dir, `${hash}.svg`);
  await writeFile(svgPath, svg, "utf8");
  return svgPath;
}

async function renderMermaidBlocks(markdown: string): Promise<string> {
  const blocks = [...markdown.matchAll(/```mermaid\s*\n([\s\S]*?)\n```/gi)];
  if (blocks.length === 0) return markdown;

  const replacements = new Map<string, string>();
  for (const match of blocks) {
    const block = match[0];
    const source = match[1].trim();
    if (!source) continue;
    if (source.length > MAX_MERMAID_SOURCE_CHARS) {
      replacements.set(block, `${block}\n\n_Mermaid diagram too large to render inline._`);
      continue;
    }
    try {
      const svg = await renderMermaidSvg(source);
      if (!svg) {
        replacements.set(
          block,
          `${block}\n\n_Could not render this Mermaid diagram. The local fallback supports ER, pie, and basic flowchart diagrams._`,
        );
        continue;
      }
      const svgPath = await writeMermaidSvg(svg, source);
      const imageUrl =
        (await quickLookThumbnailToImageDataUrl(svgPath, undefined, "us-mermaid-")) || `file://${encodeURI(svgPath)}`;
      replacements.set(block, `\n![Mermaid diagram](${imageUrl})\n\n_Mermaid diagram rendered locally._\n`);
    } catch (e) {
      replacements.set(block, `${block}\n\n_Could not render Mermaid locally: ${(e as Error).message}_`);
    }
  }

  let rendered = markdown;
  for (const [block, replacement] of replacements) rendered = rendered.replace(block, replacement);
  return rendered;
}

function buildHeader(r: SearchResult, showPath: boolean, showMetadata: boolean): string {
  const path = r.path ? tildify(r.path) : undefined;
  const lines: string[] = [];
  lines.push(`# ${r.title}\n`);
  if (showPath) {
    if (path) lines.push(`\`${path}\`\n`);
    if (r.url) lines.push(`<${r.url}>\n`);
  }
  if (showMetadata) {
    const meta: string[] = [];
    if (r.modifiedAt !== undefined) meta.push(`**Modified:** ${formatTime(r.modifiedAt)}`);
    if (r.kind !== "folder" && r.size !== undefined) meta.push(`**Size:** ${formatSize(r.size)}`);
    if (meta.length) lines.push(meta.join(" · ") + "\n");
  }
  return lines.join("\n");
}

function ResultDetail({
  r,
  vaultPath,
  showPath,
  showMetadata,
}: {
  r: SearchResult;
  vaultPath?: string;
  showPath: boolean;
  showMetadata: boolean;
}) {
  const [body, setBody] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(!!r.path);

  useEffect(() => {
    let cancelled = false;
    if (r.kind === "contact") {
      setIsLoading(!!r.imageBase64);
      (async () => {
        const lines: string[] = [];
        if (r.imageBase64) {
          const resized = await resizeJpegBase64ToDataUrl(r.imageBase64, 0.5);
          if (cancelled) return;
          lines.push(`\n![](${resized ?? `data:image/jpeg;base64,${r.imageBase64}`})\n`);
        }
        if (r.emails && r.emails.length) {
          lines.push("\n**Email**\n");
          for (const e of r.emails) lines.push(`- <${e}>`);
        }
        if (r.phones && r.phones.length) {
          lines.push("\n**Phone**\n");
          for (const p of r.phones) lines.push(`- ${p}`);
        }
        if (!cancelled) {
          setBody(lines.join("\n"));
          setIsLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }
    if (r.kind === "photo") {
      const lines: string[] = [];
      if (r.photoCreatedAt !== undefined) lines.push(`\n**Created:** ${formatTime(r.photoCreatedAt)}`);
      if (r.photoWidth && r.photoHeight) lines.push(`**Dimensions:** ${r.photoWidth} x ${r.photoHeight}`);
      if (r.photoIdentifier) lines.push(`**Photos ID:** \`${r.photoIdentifier}\``);
      if (r.path) {
        setIsLoading(true);
        (async () => {
          const dataUrl = await quickLookThumbnailToImageDataUrl(r.path!, undefined, "us-photo-");
          if (cancelled) return;
          setBody(`${dataUrl ? `\n![](${dataUrl})\n\n` : ""}${lines.join("\n\n")}`);
          setIsLoading(false);
        })();
        return () => {
          cancelled = true;
        };
      } else {
        setBody(lines.join("\n\n"));
        setIsLoading(false);
      }
      return;
    }
    if (r.kind === "event") {
      const lines: string[] = [];
      const fmt = (ms?: number) => (ms !== undefined ? formatTime(ms) : "—");
      lines.push(`\n**When:** ${fmt(r.eventStart)}${r.eventEnd ? ` → ${fmt(r.eventEnd)}` : ""}`);
      if (r.location) lines.push(`**Location:** ${r.location}`);
      if (r.calendar) lines.push(`**Calendar:** ${r.calendar}`);
      setBody(lines.join("\n\n"));
      setIsLoading(false);
      return;
    }
    if (r.kind === "script-command") {
      const lines: string[] = [];
      if (r.scriptPackageName) lines.push(`\n**Package:** ${r.scriptPackageName}`);
      if (r.scriptDescription) lines.push(`**Description:** ${r.scriptDescription}`);
      if (r.scriptMode) lines.push(`**Mode:** ${r.scriptMode}`);
      if (r.scriptSchemaVersion) lines.push(`**Schema:** ${r.scriptSchemaVersion}`);
      if ((r.scriptArgumentCount ?? 0) > 0) {
        lines.push(`**Arguments:** ${r.scriptArgumentCount} (not supported in Universal Search)`);
      }
      setBody(lines.join("\n\n"));
      setIsLoading(false);
      return;
    }
    if (!r.path) {
      setIsLoading(false);
      return;
    }
    if (r.kind === "folder") {
      setBody("");
      setIsLoading(false);
      return;
    }
    if (IMAGE_EXT_RE.test(r.path)) {
      setIsLoading(true);
      (async () => {
        const dataUrl = await fileToImageDataUrl(r.path!);
        if (cancelled) return;
        setBody(dataUrl ? `\n![](${dataUrl})\n` : `\n_Image too large to inline (>4 MB)._`);
        setIsLoading(false);
      })();
      return () => {
        cancelled = true;
      };
    }
    if (/\.pdf$/i.test(r.path)) {
      setIsLoading(true);
      (async () => {
        const dataUrl = await pdfToImageDataUrl(r.path!);
        if (cancelled) return;
        setBody(dataUrl ? `\n![](${dataUrl})\n` : `\n_Could not render PDF preview. Press ⌘Y for Quick Look._`);
        setIsLoading(false);
      })();
      return () => {
        cancelled = true;
      };
    }
    if (VIDEO_EXT_RE.test(r.path)) {
      setIsLoading(true);
      (async () => {
        const dataUrl = await videoToImageDataUrl(r.path!);
        if (cancelled) return;
        setBody(dataUrl ? `\n![](${dataUrl})\n` : `\n_Could not render video thumbnail. Press ⌘Y for Quick Look._`);
        setIsLoading(false);
      })();
      return () => {
        cancelled = true;
      };
    }
    if (DOCUMENT_EXT_RE.test(r.path)) {
      setIsLoading(true);
      (async () => {
        const dataUrl = await quickLookThumbnailToImageDataUrl(r.path!, undefined, "us-document-");
        if (cancelled) return;
        setBody(dataUrl ? `\n![](${dataUrl})\n` : `\n_Could not render document preview. Press ⌘Y for Quick Look._`);
        setIsLoading(false);
      })();
      return () => {
        cancelled = true;
      };
    }
    if (PARQUET_EXT_RE.test(r.path)) {
      setIsLoading(true);
      (async () => {
        try {
          const md = await parquetPreviewMarkdown(r.path!);
          if (cancelled) return;
          setBody(md);
        } catch (e) {
          if (cancelled) return;
          setBody(`\n_Could not read Parquet metadata: ${(e as Error).message}_`);
        } finally {
          if (!cancelled) setIsLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }
    if (!TEXT_EXT_RE.test(r.path)) {
      setBody(
        r.matchPreview
          ? `\n**Match${r.matchLine ? ` — line ${r.matchLine}` : ""}**\n\n\`\`\`\n${r.matchPreview}\n\`\`\`\n`
          : "",
      );
      setIsLoading(false);
      return;
    }
    if ((r.size ?? 0) > SKIP_PREVIEW_BYTES) {
      setBody(`\n_File too large to preview (${formatSize(r.size)}). Press ⌘Y for Quick Look._`);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    (async () => {
      try {
        const fs = await import("fs/promises");
        const fh = await fs.open(r.path!, "r");
        try {
          const buf = Buffer.alloc(MAX_PREVIEW_BYTES);
          const { bytesRead } = await fh.read(buf, 0, MAX_PREVIEW_BYTES, 0);
          const text = buf.subarray(0, bytesRead).toString("utf8");
          if (cancelled) return;
          const truncated = (r.size ?? bytesRead) > MAX_PREVIEW_BYTES;
          const ext = (r.path!.match(/\.([^.]+)$/)?.[1] || "").toLowerCase();
          const isMarkdown = ext === "md" || ext === "markdown";
          const clipped = clipForRendering(text, !isMarkdown);
          let md: string;
          if (isMarkdown) {
            const rendered = await rewriteObsidianMarkdown(clipped, vaultPath, r.path);
            if (cancelled) return;
            md = "\n---\n\n" + (await renderMermaidBlocks(rendered));
            if (cancelled) return;
          } else {
            md = "\n```" + langFromExt(r.path!) + "\n" + clipped + "\n```\n";
          }
          if (truncated) md += `\n\n_…truncated at ${formatSize(MAX_PREVIEW_BYTES)}_`;
          setBody(md);
        } finally {
          await fh.close();
        }
      } catch (e) {
        if (!cancelled) setBody(`\n_Could not read file: ${(e as Error).message}_`);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    r.path,
    r.kind,
    r.matchPreview,
    r.matchLine,
    r.size,
    r.emails,
    r.phones,
    r.photoIdentifier,
    r.photoCreatedAt,
    r.photoWidth,
    r.photoHeight,
    r.eventStart,
    r.eventEnd,
    r.location,
    r.calendar,
    r.scriptArgumentCount,
    r.scriptDescription,
    r.scriptMode,
    r.scriptPackageName,
    r.scriptSchemaVersion,
    vaultPath,
  ]);

  return <List.Item.Detail isLoading={isLoading} markdown={buildHeader(r, showPath, showMetadata) + body} />;
}

function obsidianOpenUrl(filePath: string, vaultPath?: string): string {
  if (vaultPath) {
    const vault = path.basename(vaultPath.replace(/\/+$/, ""));
    const rel = path.relative(vaultPath, filePath);
    if (rel && !rel.startsWith("..")) {
      return `obsidian://open?vault=${encodeURIComponent(vault)}&file=${encodeURIComponent(rel)}`;
    }
  }
  return `obsidian://open?path=${encodeURIComponent(filePath)}`;
}

function openInEditor(filePath: string, editor: string) {
  if (editor.startsWith("/") || editor.startsWith("~")) {
    const bin = editor.replace(/^~/, process.env.HOME ?? "~");
    spawn(bin, [filePath], { detached: true, stdio: "ignore" }).unref();
  } else {
    spawn("open", ["-a", editor, filePath], { detached: true, stdio: "ignore" }).unref();
  }
}

async function runScriptCommandResult(r: SearchResult) {
  if (!r.path) return;
  if ((r.scriptArgumentCount ?? 0) > 0) {
    showToast({
      style: Toast.Style.Failure,
      title: "Arguments Not Supported",
      message: "Run this script from Raycast's Script Commands extension.",
    });
    return;
  }

  const toast = await showToast({ style: Toast.Style.Animated, title: `Running ${r.title}` });
  let stdout = "";
  let stderr = "";
  await new Promise<void>((resolve) => {
    const child = spawn(r.path!, [], {
      cwd: path.dirname(r.path!),
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", (e) => {
      toast.style = Toast.Style.Failure;
      toast.title = "Script Failed";
      toast.message = e.message;
      resolve();
    });
    child.on("close", (code) => {
      if (code === 0) {
        const output = stdout.trim();
        toast.style = Toast.Style.Success;
        toast.title = "Script Finished";
        toast.message = output ? output.split("\n")[0].slice(0, 180) : r.title;
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = "Script Failed";
        toast.message = (stderr.trim() || stdout.trim() || `Exited ${code}`).split("\n")[0].slice(0, 180);
      }
      resolve();
    });
  });
}

function PrimaryActions({
  r,
  vaultPath,
  editor,
  onOpenResult,
}: {
  r: SearchResult;
  vaultPath?: string;
  editor?: string;
  onOpenResult: (r: SearchResult) => void;
}) {
  const rememberAndOpen = (target: string) => {
    onOpenResult(r);
    open(target);
  };
  const rememberAndOpenInEditor = (filePath: string) => {
    if (!editor) return;
    onOpenResult(r);
    openInEditor(filePath, editor);
  };
  const editorTitle = editor ? `Open in Editor (${editor.split("/").pop() || editor})` : undefined;

  if (r.kind === "bookmark" && r.url) {
    return (
      <>
        <Action title="Open in Browser" icon={Icon.Globe} onAction={() => rememberAndOpen(r.url!)} />
        <Action.CopyToClipboard title="Copy URL" content={r.url} shortcut={{ modifiers: ["cmd", "shift"], key: "c" }} />
      </>
    );
  }

  if (r.kind === "contact" && r.url) {
    return (
      <>
        <Action title="Open in Contacts" icon={Icon.Person} onAction={() => rememberAndOpen(r.url!)} />
        {r.emails && r.emails[0] && (
          <Action.CopyToClipboard
            title="Copy Email"
            content={r.emails[0]}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        )}
      </>
    );
  }

  if (r.kind === "event" && r.url) {
    return <Action title="Open in Calendar" icon={Icon.Calendar} onAction={() => rememberAndOpen(r.url!)} />;
  }

  if (r.kind === "photo") {
    return (
      <>
        <Action
          title="Open Photos"
          icon={Icon.Image}
          onAction={() => {
            onOpenResult(r);
            spawn("open", ["-a", "Photos"], { detached: true, stdio: "ignore" }).unref();
          }}
        />
        {r.photoIdentifier && (
          <Action.CopyToClipboard
            title="Copy Photos Identifier"
            content={r.photoIdentifier}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        )}
      </>
    );
  }

  if (r.kind === "application" && r.path) {
    return (
      <>
        <Action title="Launch" icon={Icon.Play} onAction={() => rememberAndOpen(r.path!)} />
        <Action.ShowInFinder path={r.path} />
        <Action.CopyToClipboard
          title="Copy Path"
          content={r.path}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        />
      </>
    );
  }

  if (!r.path) return null;

  if (r.kind === "script-command") {
    return (
      <>
        <Action
          title="Run Script Command"
          icon={Icon.Terminal}
          onAction={() => {
            onOpenResult(r);
            runScriptCommandResult(r);
          }}
        />
        {editorTitle && (
          <Action
            title={editorTitle}
            icon={Icon.Code}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
            onAction={() => rememberAndOpenInEditor(r.path!)}
          />
        )}
        <Action.ShowInFinder path={r.path} />
        <Action.CopyToClipboard
          title="Copy Path"
          content={r.path}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        />
      </>
    );
  }

  if (r.kind === "note") {
    const obsidianUrl = obsidianOpenUrl(r.path, vaultPath);
    return (
      <>
        <Action title="Open in Obsidian" icon={Icon.Pencil} onAction={() => rememberAndOpen(obsidianUrl)} />
        {editorTitle && (
          <Action
            title={editorTitle}
            icon={Icon.Code}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
            onAction={() => rememberAndOpenInEditor(r.path!)}
          />
        )}
        <Action title="Open in Default App" icon={Icon.Document} onAction={() => rememberAndOpen(r.path!)} />
        <Action.ShowInFinder path={r.path} />
        <Action.CopyToClipboard
          title="Copy Path"
          content={r.path}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        />
      </>
    );
  }

  if (r.kind === "folder") {
    return (
      <>
        <Action
          title="Open in Finder"
          icon={Icon.Finder}
          onAction={() => {
            onOpenResult(r);
            showInFinder(r.path!);
          }}
        />
        {editorTitle && (
          <Action
            title={editorTitle}
            icon={Icon.Code}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
            onAction={() => rememberAndOpenInEditor(r.path!)}
          />
        )}
        <Action.OpenWith path={r.path} shortcut={{ modifiers: ["cmd"], key: "o" }} />
        <Action.CopyToClipboard
          title="Copy Path"
          content={r.path}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        />
      </>
    );
  }

  return (
    <>
      <Action title="Open in Default App" icon={Icon.Document} onAction={() => rememberAndOpen(r.path!)} />
      {editorTitle && (
        <Action
          title={editorTitle}
          icon={Icon.Code}
          shortcut={{ modifiers: ["cmd"], key: "e" }}
          onAction={() => rememberAndOpenInEditor(r.path!)}
        />
      )}
      <Action.ShowInFinder path={r.path} />
      <Action.OpenWith path={r.path} shortcut={{ modifiers: ["cmd", "shift"], key: "o" }} />
      <Action.CopyToClipboard title="Copy Path" content={r.path} shortcut={{ modifiers: ["cmd", "shift"], key: "c" }} />
    </>
  );
}

export default function Command() {
  const prefs = getPreferenceValues<Preferences>();
  const vaultPath = prefs.obsidianVaultPath ? untildify(prefs.obsidianVaultPath.trim()) : undefined;
  const hasObsidianVault = !!vaultPath && existsSync(vaultPath);
  const activeVaultPath = hasObsidianVault ? vaultPath : undefined;
  const limit = Math.max(1, parseInt(prefs.maxPerSource || "10", 10) || 10);
  const sourceLimits = useMemo(
    () => sourceLimitsFromPreferences(prefs, limit),
    [
      prefs.maxApplications,
      prefs.maxScriptCommands,
      prefs.maxFileContents,
      prefs.maxFileNames,
      prefs.maxFolders,
      prefs.maxObsidian,
      prefs.maxBookmarks,
      prefs.maxContacts,
      prefs.maxEvents,
      prefs.maxPhotos,
      limit,
    ],
  );
  const sectionOrder = useMemo(
    () => sectionOrderFromPreferences(prefs),
    [
      prefs.priorityApplications,
      prefs.priorityScriptCommands,
      prefs.priorityFileContents,
      prefs.priorityFileNames,
      prefs.priorityFolders,
      prefs.priorityObsidian,
      prefs.priorityBookmarks,
      prefs.priorityContacts,
      prefs.priorityEvents,
      prefs.priorityPhotos,
      prefs.sectionOrder,
    ],
  );
  const showPreviewPath = prefs.showPreviewPath !== false;
  const showPreviewMetadata = prefs.showPreviewMetadata !== false;
  const showRecentItems = prefs.showRecentItems !== false;
  const recentItemsCount = Math.min(50, parseCount(prefs.recentItemsCount, 10));
  const editor = prefs.defaultEditor?.trim() || undefined;

  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<ResultKind | "all">("all");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recentResults, setRecentResults] = useState<RecentSearchResult[]>([]);
  const [totals, setTotals] = useState<Partial<Record<ResultKind, { total: number; truncated: boolean }>>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showDetail, setShowDetail] = useState(true);
  const abortRef = useRef<AbortController | null>(null);
  const photosPermissionAlertShownRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    loadRecentResults().then((items) => {
      if (!cancelled) setRecentResults(items);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const enabledFilterKinds = useMemo(
    () =>
      DEFAULT_SECTION_ORDER.filter((kind) => {
        if (kind === "note") return prefs.enableObsidian && hasObsidianVault;
        if (kind === "file-content") return prefs.enableFileContents;
        if (kind === "file") return prefs.enableFileNames;
        if (kind === "folder") return prefs.enableFolders;
        if (kind === "bookmark") return prefs.enableBookmarks;
        if (kind === "contact") return prefs.enableContacts;
        if (kind === "event") return prefs.enableEvents;
        if (kind === "application") return prefs.enableApplications;
        if (kind === "photo") return prefs.enablePhotos;
        if (kind === "script-command") return prefs.enableScriptCommands && !!prefs.scriptCommandsPath?.trim();
        return true;
      }),
    [
      prefs.enableApplications,
      prefs.enableScriptCommands,
      prefs.enableBookmarks,
      prefs.enableContacts,
      prefs.enableEvents,
      prefs.enableFileContents,
      prefs.enableFileNames,
      prefs.enableFolders,
      prefs.enableObsidian,
      prefs.enablePhotos,
      prefs.scriptCommandsPath,
      hasObsidianVault,
    ],
  );

  useEffect(() => {
    if (typeFilter !== "all" && !enabledFilterKinds.includes(typeFilter)) setTypeFilter("all");
  }, [enabledFilterKinds, typeFilter]);

  const recordRecentResult = useCallback((r: SearchResult) => {
    const openedAt = Date.now();
    setRecentResults((prev) => {
      const key = recentKey(r);
      const existing = prev.find((item) => recentKey(item) === key);
      const nextItem: RecentSearchResult = {
        ...cleanResultForRecent(r),
        lastOpenedAt: openedAt,
        openCount: (existing?.openCount ?? 0) + 1,
      };
      const next = sortRecents([nextItem, ...prev.filter((item) => recentKey(item) !== key)]).slice(
        0,
        MAX_STORED_RECENTS,
      );
      saveRecentResults(next).catch((e) => {
        console.error("[universal-search/recent]", e);
      });
      return next;
    });
  }, []);

  const addRecentResult = useCallback((r: SearchResult) => {
    const addedAt = Date.now();
    setRecentResults((prev) => {
      const key = recentKey(r);
      const existing = prev.find((item) => recentKey(item) === key);
      const nextItem: RecentSearchResult = {
        ...cleanResultForRecent(r),
        lastOpenedAt: addedAt,
        openCount: existing?.openCount ?? 0,
      };
      const next = sortRecents([nextItem, ...prev.filter((item) => recentKey(item) !== key)]).slice(
        0,
        MAX_STORED_RECENTS,
      );
      saveRecentResults(next).catch((e) => {
        console.error("[universal-search/recent]", e);
      });
      return next;
    });
    showToast({ style: Toast.Style.Success, title: "Added to Recent", message: r.title });
  }, []);

  const removeRecentResult = useCallback((r: SearchResult) => {
    setRecentResults((prev) => {
      const key = recentKey(r);
      const next = prev.filter((item) => recentKey(item) !== key);
      saveRecentResults(next).catch((e) => {
        console.error("[universal-search/recent]", e);
      });
      return next;
    });
  }, []);

  const clearRecentResults = useCallback(() => {
    setRecentResults([]);
    saveRecentResults([]).catch((e) => {
      console.error("[universal-search/recent]", e);
    });
  }, []);

  const trashResult = useCallback(async (r: SearchResult) => {
    if (!r.path) return;
    const title = r.kind === "note" ? "Move Note to Trash?" : "Move File to Trash?";
    const confirmed = await confirmAlert({
      icon: Icon.Trash,
      title,
      message: tildify(r.path),
      primaryAction: {
        title: "Move to Trash",
        style: Alert.ActionStyle.Destructive,
      },
      dismissAction: {
        title: "Cancel",
        style: Alert.ActionStyle.Cancel,
      },
    });
    if (!confirmed) return;

    try {
      await trash(r.path);
      const trashedPath = r.path.toLowerCase();
      setResults((prev) => prev.filter((item) => item.path?.toLowerCase() !== trashedPath));
      setRecentResults((prev) => {
        const next = prev.filter((item) => item.path?.toLowerCase() !== trashedPath);
        saveRecentResults(next).catch((e) => {
          console.error("[universal-search/recent]", e);
        });
        return next;
      });
      showToast({ style: Toast.Style.Success, title: "Moved to Trash", message: r.title });
    } catch (e) {
      showToast({ style: Toast.Style.Failure, title: "Could not move to Trash", message: (e as Error).message });
    }
  }, []);

  const removeBookmarkResult = useCallback(async (r: SearchResult) => {
    if (r.kind !== "bookmark" || !r.url) return;
    const confirmed = await confirmAlert({
      icon: Icon.Trash,
      title: "Remove Bookmark?",
      message: `${r.title}\n${r.url}`,
      primaryAction: {
        title: "Remove Bookmark",
        style: Alert.ActionStyle.Destructive,
      },
      dismissAction: {
        title: "Cancel",
        style: Alert.ActionStyle.Cancel,
      },
    });
    if (!confirmed) return;

    const ac = new AbortController();
    try {
      await removeSafariBookmark(r.url, ac.signal);
      const removedUrl = r.url.toLowerCase();
      setResults((prev) => prev.filter((item) => item.kind !== "bookmark" || item.url?.toLowerCase() !== removedUrl));
      setRecentResults((prev) => {
        const next = prev.filter((item) => item.kind !== "bookmark" || item.url?.toLowerCase() !== removedUrl);
        saveRecentResults(next).catch((e) => {
          console.error("[universal-search/recent]", e);
        });
        return next;
      });
      showToast({ style: Toast.Style.Success, title: "Bookmark Removed", message: r.title });
    } catch (e) {
      showToast({ style: Toast.Style.Failure, title: "Could Not Remove Bookmark", message: (e as Error).message });
    }
  }, []);

  const deleteContactResult = useCallback(async (r: SearchResult) => {
    if (r.kind !== "contact") return;
    const identifier = r.id.startsWith("contact:") ? r.id.slice("contact:".length) : undefined;
    if (!identifier) return;

    const confirmed = await confirmAlert({
      icon: Icon.Trash,
      title: "Delete Contact?",
      message: r.subtitle ? `${r.title}\n${r.subtitle}` : r.title,
      primaryAction: {
        title: "Delete Contact",
        style: Alert.ActionStyle.Destructive,
      },
      dismissAction: {
        title: "Cancel",
        style: Alert.ActionStyle.Cancel,
      },
    });
    if (!confirmed) return;

    const ac = new AbortController();
    try {
      await deleteContact(identifier, ac.signal);
      setResults((prev) => prev.filter((item) => item.kind !== "contact" || item.id !== r.id));
      setRecentResults((prev) => {
        const next = prev.filter((item) => item.kind !== "contact" || item.id !== r.id);
        saveRecentResults(next).catch((e) => {
          console.error("[universal-search/recent]", e);
        });
        return next;
      });
      showToast({ style: Toast.Style.Success, title: "Contact Deleted", message: r.title });
    } catch (e) {
      showToast({ style: Toast.Style.Failure, title: "Could Not Delete Contact", message: (e as Error).message });
    }
  }, []);

  useEffect(() => {
    const q = query.trim();
    abortRef.current?.abort();
    if (q.length < 2) {
      setResults([]);
      setTotals({});
      setIsLoading(false);
      return;
    }
    const ac = new AbortController();
    abortRef.current = ac;
    setIsLoading(true);

    const parsed = parseQuery(q);
    const kindFilter = parsed.kinds.length > 0 ? new Set<ResultKind>(parsed.kinds) : undefined;
    const shouldSearch = (kind: ResultKind): boolean => !kindFilter || kindFilter.has(kind);
    const base: Omit<SourceContext, "exclude" | "limit"> = {
      query: parsed.search.trim(),
      vaultPath: activeVaultPath,
      scriptCommandsPath: prefs.scriptCommandsPath,
      signal: ac.signal,
    };
    const withExclude = (kind: ResultKind, exclude: string[]): SourceContext => ({
      ...base,
      limit: sourceLimits[kind],
      exclude,
    });
    const empty = (): SourceOutput => ({ results: [], total: 0 });

    const globalRaw = parseList(prefs.excludeGlobal);
    const globalPathExcludes = parsePathExcludes(prefs.excludeGlobal);
    const merge = (...lists: string[][]): string[] => Array.from(new Set(lists.flat()));
    const didSearchBookmarks = prefs.enableBookmarks && shouldSearch("bookmark");
    const didSearchContacts = prefs.enableContacts && shouldSearch("contact");
    const didSearchEvents = prefs.enableEvents && shouldSearch("event");
    const didSearchPhotos = prefs.enablePhotos && shouldSearch("photo");

    const tasks: Promise<SourceOutput>[] = [];
    if (prefs.enableFileContents && shouldSearch("file-content"))
      tasks.push(
        searchFileContents(
          withExclude("file-content", merge(parsePathExcludes(prefs.excludeFileContents), globalPathExcludes)),
        ).catch(empty),
      );
    if (prefs.enableFileNames && shouldSearch("file"))
      tasks.push(
        searchFileNames(
          withExclude("file", merge(parsePathExcludes(prefs.excludeFileNames), globalPathExcludes)),
        ).catch(empty),
      );
    if (prefs.enableFolders && shouldSearch("folder"))
      tasks.push(
        searchFolders(withExclude("folder", merge(parsePathExcludes(prefs.excludeFolders), globalPathExcludes))).catch(
          empty,
        ),
      );
    if (prefs.enableObsidian && activeVaultPath && shouldSearch("note"))
      tasks.push(
        searchObsidian(
          withExclude(
            "note",
            merge(parsePathExcludesRelativeTo(prefs.excludeObsidian, activeVaultPath), globalPathExcludes),
          ),
        ).catch(empty),
      );
    if (didSearchBookmarks)
      tasks.push(
        searchBookmarks(withExclude("bookmark", merge(parseList(prefs.excludeBookmarks), globalRaw))).catch(empty),
      );
    if (prefs.enableApplications && shouldSearch("application"))
      tasks.push(searchApplications(withExclude("application", globalPathExcludes)).catch(empty));
    if (prefs.enableScriptCommands && prefs.scriptCommandsPath?.trim() && shouldSearch("script-command"))
      tasks.push(searchScriptCommands(withExclude("script-command", globalPathExcludes)).catch(empty));
    if (didSearchContacts) tasks.push(searchContacts(withExclude("contact", globalRaw)).catch(empty));
    if (didSearchEvents) {
      const lookback = Math.max(0, parseInt(prefs.eventLookbackDays || "30", 10) || 30);
      const lookahead = Math.max(0, parseInt(prefs.eventLookaheadDays || "90", 10) || 90);
      tasks.push(
        searchEvents({
          ...withExclude("event", globalRaw),
          lookbackDays: lookback,
          lookaheadDays: lookahead,
        } as SourceContext).catch(empty),
      );
    }
    if (didSearchPhotos)
      tasks.push(
        searchPhotos({
          ...withExclude("photo", globalRaw),
          photosLibraryPath: prefs.photosLibraryPath,
        } as SourceContext).catch(empty),
      );

    Promise.all(tasks)
      .then(async (outs) => {
        if (ac.signal.aborted) return;
        const flat: SearchResult[] = [];
        const tot: Partial<Record<ResultKind, { total: number; truncated: boolean }>> = {};
        for (const o of outs) {
          flat.push(...o.results);
          if (o.results.length > 0) {
            const k = o.results[0].kind;
            const prev = tot[k];
            tot[k] = {
              total: Math.max(prev?.total ?? 0, o.total),
              truncated: (prev?.truncated ?? false) || (o.truncated ?? false),
            };
          }
        }
        setResults(flat);
        setTotals(tot);
        if (didSearchBookmarks) {
          const err = getBookmarkError();
          if (err) showToast({ style: Toast.Style.Failure, title: "Safari Bookmarks unavailable", message: err });
        }
        if (didSearchContacts) {
          const err = getContactsError();
          if (err) showToast({ style: Toast.Style.Failure, title: "Contacts unavailable", message: err });
        }
        if (didSearchEvents) {
          const err = getCalendarError();
          if (err) showToast({ style: Toast.Style.Failure, title: "Calendar unavailable", message: err });
        }
        if (didSearchPhotos) {
          const err = getPhotosError();
          if (err?.includes("Full Disk Access")) {
            if (!photosPermissionAlertShownRef.current) {
              photosPermissionAlertShownRef.current = true;
              try {
                await showPhotosPermissionAlert();
              } catch {
                showToast({ style: Toast.Style.Failure, title: "Full Disk Access required", message: err });
              }
            }
          } else if (err) {
            showToast({ style: Toast.Style.Failure, title: "Photos unavailable", message: err });
          }
        }
      })
      .finally(() => {
        if (!ac.signal.aborted) setIsLoading(false);
      });

    return () => ac.abort();
  }, [
    query,
    sourceLimits,
    activeVaultPath,
    prefs.enableFileContents,
    prefs.enableFileNames,
    prefs.enableFolders,
    prefs.enableObsidian,
    prefs.enableBookmarks,
    prefs.enableApplications,
    prefs.enableScriptCommands,
    prefs.enableContacts,
    prefs.enableEvents,
    prefs.enablePhotos,
    prefs.photosLibraryPath,
    prefs.scriptCommandsPath,
    prefs.eventLookbackDays,
    prefs.eventLookaheadDays,
    prefs.excludeFileContents,
    prefs.excludeFileNames,
    prefs.excludeFolders,
    prefs.excludeObsidian,
    prefs.excludeBookmarks,
    prefs.excludeGlobal,
  ]);

  const grouped = useMemo(() => {
    const by: Record<ResultKind, SearchResult[]> = {
      "file-content": [],
      file: [],
      folder: [],
      note: [],
      bookmark: [],
      contact: [],
      event: [],
      application: [],
      photo: [],
      "script-command": [],
    };
    for (const r of results) by[r.kind].push(r);
    // Cross-section dedup: a single underlying item (same path / URL) shows up
    // only in its highest-priority section per the configured section order.
    const seen = new Set<string>();
    for (const kind of sectionOrder) {
      const kept: SearchResult[] = [];
      for (const r of by[kind]) {
        const key = (r.path ?? r.url ?? r.id).toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        kept.push(r);
      }
      by[kind] = kept;
    }
    return by;
  }, [results, sectionOrder]);

  const visibleRecentResults = useMemo(() => {
    if (!showRecentItems) return [];
    const filtered = typeFilter === "all" ? recentResults : recentResults.filter((r) => r.kind === typeFilter);
    return filtered.slice(0, recentItemsCount);
  }, [recentResults, recentItemsCount, showRecentItems, typeFilter]);

  const renderResultItem = (r: SearchResult, keyPrefix = "", isRecent = false, index = 0) => {
    const meta = KIND_META[r.kind];
    const isInRecent = recentResults.some((item) => recentKey(item) === recentKey(r));
    const fallbackIcon =
      r.kind === "application" && r.path ? { fileIcon: r.path } : { source: meta.icon, tintColor: meta.color };
    const previewIcon =
      canUsePreviewIcon(r) && r.imageBase64
        ? { source: `data:image/jpeg;base64,${r.imageBase64}`, mask: Image.Mask.Circle, fallback: meta.icon }
        : undefined;
    return (
      <List.Item
        key={`${keyPrefix}${r.id}:${index}`}
        icon={(previewIcon ?? fallbackIcon) as Image.ImageLike}
        title={r.title}
        subtitle={showDetail ? undefined : r.subtitle ? shortenPath(r.subtitle) : r.url}
        accessories={showDetail ? undefined : [{ text: r.subtitle ? shortenPath(r.subtitle) : (r.url ?? "") }]}
        detail={
          <ResultDetail
            r={r}
            vaultPath={activeVaultPath}
            showPath={showPreviewPath}
            showMetadata={showPreviewMetadata}
          />
        }
        quickLook={r.path ? { path: r.path, name: r.title } : undefined}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <PrimaryActions r={r} vaultPath={activeVaultPath} editor={editor} onOpenResult={recordRecentResult} />
            </ActionPanel.Section>
            <ActionPanel.Section>
              {r.path && <Action.ToggleQuickLook shortcut={{ modifiers: ["cmd"], key: "y" }} />}
              <Action
                title={showDetail ? "Hide Details" : "Show Details"}
                icon={Icon.Sidebar}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
                onAction={() => setShowDetail((v) => !v)}
              />
              {isRecent && (
                <>
                  <Action
                    title="Remove from Recent"
                    icon={Icon.Trash}
                    shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                    onAction={() => removeRecentResult(r)}
                  />
                  <Action
                    title="Clear Recent Items"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={clearRecentResults}
                  />
                </>
              )}
              {!isRecent && !isInRecent && (
                <Action
                  title="Add to Recent"
                  icon={Icon.Clock}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                  onAction={() => addRecentResult(r)}
                />
              )}
              {canTrashResult(r) && (
                <Action
                  title={r.kind === "note" ? "Move Note to Trash" : "Move File to Trash"}
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
                  onAction={() => trashResult(r)}
                />
              )}
              {r.kind === "bookmark" && r.url && (
                <Action
                  title="Remove Bookmark"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
                  onAction={() => removeBookmarkResult(r)}
                />
              )}
              {r.kind === "contact" && (
                <Action
                  title="Delete Contact"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
                  onAction={() => deleteContactResult(r)}
                />
              )}
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  };

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showDetail}
      searchBarPlaceholder="Search applications, scripts, notes, files, folders, bookmarks, photos…"
      onSearchTextChange={setQuery}
      throttle
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Type"
          value={typeFilter}
          onChange={(v) => setTypeFilter(v as ResultKind | "all")}
        >
          <List.Dropdown.Item title="All" value="all" icon={Icon.MagnifyingGlass} />
          {enabledFilterKinds.map((k) => {
            const m = KIND_META[k];
            return (
              <List.Dropdown.Item key={k} title={m.section} value={k} icon={{ source: m.icon, tintColor: m.color }} />
            );
          })}
        </List.Dropdown>
      }
    >
      {query.trim().length < 2 ? (
        visibleRecentResults.length > 0 ? (
          <List.Section title="Recent" subtitle={`${visibleRecentResults.length}`}>
            {visibleRecentResults.map((r, index) => renderResultItem(r, "recent:", true, index))}
          </List.Section>
        ) : (
          <List.EmptyView
            icon={Icon.MagnifyingGlass}
            title="Type to search"
            description="Searches Applications, Script Commands, Obsidian notes, files, folders, bookmarks, contacts, events, and Photos."
          />
        )
      ) : results.length === 0 && !isLoading ? (
        <List.EmptyView icon={Icon.QuestionMark} title="No results" />
      ) : (
        sectionOrder.map((kind) => {
          if (typeFilter !== "all" && typeFilter !== kind) return null;
          const items = grouped[kind];
          if (items.length === 0) return null;
          const meta = KIND_META[kind];
          const t = totals[kind];
          const total = t?.total ?? items.length;
          const label = t?.truncated ? `${total}+` : `${total}`;
          const subtitle = total > items.length ? `${items.length} of ${label}` : label;
          return (
            <List.Section key={kind} title={meta.section} subtitle={subtitle}>
              {items.map((r, index) => renderResultItem(r, "", false, index))}
            </List.Section>
          );
        })
      )}
    </List>
  );
}
