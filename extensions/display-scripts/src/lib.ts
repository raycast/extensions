import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { exec } from "node:child_process";
import { promisify } from "node:util";

export const pexec = promisify(exec);

export interface Prefs {
  displayplacerPath: string;
}

export interface Display {
  id: string;
  type: string;
  resolution: string;
  width: number;
  height: number;
  origin: string;
  originX: number;
  originY: number;
  hz: string;
  rotation: string;
  isMacBook: boolean;
}

export interface SavedConfig {
  externalDisplayId?: string;
  macbookDisplayId?: string;
  macbookOriginSideBySide?: string;
  macbookOriginUpAndDown?: string;
}

const STORAGE_KEY = "display-scripts:config:v1";

export async function loadConfig(): Promise<SavedConfig> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as SavedConfig) : {};
}

export async function saveConfig(cfg: SavedConfig): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

export function getPrefs(): Prefs {
  return getPreferenceValues<Prefs>();
}

export function quoteForShell(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export async function listDisplays(): Promise<Display[]> {
  const { displayplacerPath } = getPrefs();
  const { stdout } = await pexec(`${quoteForShell(displayplacerPath)} list`);
  return parseDisplayplacerList(stdout);
}

export function parseDisplayplacerList(stdout: string): Display[] {
  const blocks = stdout.split(/\n\s*\n/);
  const displays: Display[] = [];
  for (const block of blocks) {
    const idMatch = block.match(/Persistent screen id:\s*(\S+)/);
    if (!idMatch) continue;
    const id = idMatch[1];
    const type = (block.match(/Type:\s*(.+)/)?.[1] ?? "").trim();
    const resolution = (block.match(/Resolution:\s*(\S+)/)?.[1] ?? "").trim();
    const origin = (block.match(/^Origin:\s*(\S+)/m)?.[1] ?? "").trim();
    const hz = (block.match(/Hertz:\s*(\S+)/)?.[1] ?? "").trim();
    const rotation = (block.match(/Rotation:\s*(\S+)/)?.[1] ?? "").trim();
    const [w, h] = resolution.split("x").map((n) => parseInt(n, 10));
    const originMatch = origin.match(/^\((-?\d+),\s*(-?\d+)\)$/);
    const originX = originMatch ? parseInt(originMatch[1], 10) : 0;
    const originY = originMatch ? parseInt(originMatch[2], 10) : 0;
    const isMacBook = /MacBook|built[- ]?in/i.test(type);
    displays.push({ id, type, resolution, width: w, height: h, origin, originX, originY, hz, rotation, isMacBook });
  }
  return displays;
}

export function displayLabel(d: Display): string {
  const size = d.resolution || "—";
  const hz = d.hz ? `${d.hz} Hz` : "";
  return `${d.type || "Display"} · ${size}${hz ? " · " + hz : ""}`;
}

/** Briefly shake the cursor at the center of a display so the user can see which physical screen it is. */
export async function identifyDisplay(d: Display): Promise<void> {
  const cx = d.originX + d.width / 2;
  const cy = d.originY + d.height / 2;
  const script = `
    ObjC.import('CoreGraphics');
    const cx = ${cx};
    const cy = ${cy};
    const sleep = (ms) => { const t = Date.now() + ms; while (Date.now() < t) {} };
    for (let i = 0; i < 10; i++) {
      const dx = i % 2 === 0 ? -80 : 80;
      $.CGWarpMouseCursorPosition($.CGPointMake(cx + dx, cy));
      sleep(55);
    }
    $.CGWarpMouseCursorPosition($.CGPointMake(cx, cy));
  `;
  await pexec(`osascript -l JavaScript -e ${quoteForShell(script)}`);
}

export async function openDisplayArrangement(): Promise<void> {
  await pexec(`open 'x-apple.systempreferences:com.apple.Displays-Settings.extension'`);
}

export async function getCurrentMacbookOrigin(macbookId: string): Promise<string | null> {
  const displays = await listDisplays();
  const mb = displays.find((d) => d.id === macbookId);
  return mb ? mb.origin : null;
}

export type Layout = "side-by-side" | "up-and-down";

export function buildLayoutArgs(layout: Layout, cfg: Required<SavedConfig>, displays: Display[]): string[] {
  const ext = displays.find((d) => d.id === cfg.externalDisplayId);
  const mb = displays.find((d) => d.id === cfg.macbookDisplayId);
  if (!ext || !mb) throw new Error("Configured displays not currently connected. Run Configure Displays.");

  const extArgs = `id:${ext.id} res:${ext.resolution} hz:${ext.hz} color_depth:8 enabled:true scaling:off origin:(0,0) degree:${ext.rotation || "0"}`;
  const mbOrigin = layout === "side-by-side" ? cfg.macbookOriginSideBySide : cfg.macbookOriginUpAndDown;
  const mbArgs = `id:${mb.id} res:${mb.resolution} hz:${mb.hz} color_depth:8 enabled:true scaling:on origin:${mbOrigin} degree:0`;

  return layout === "side-by-side" ? [mbArgs, extArgs] : [extArgs, mbArgs];
}

export async function applyLayout(layout: Layout, cfg: Required<SavedConfig>): Promise<void> {
  const { displayplacerPath } = getPrefs();
  const displays = await listDisplays();
  const args = buildLayoutArgs(layout, cfg, displays).map(quoteForShell).join(" ");
  await pexec(`${quoteForShell(displayplacerPath)} ${args}`);
}
