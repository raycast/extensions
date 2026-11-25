import { Clipboard, Keyboard, showHUD, showInFinder, showToast, Toast } from "@raycast/api";
import { execFile } from "child_process";
import { copyFile, mkdir, writeFile } from "fs/promises";
import { homedir } from "os";
import { join, resolve } from "path";
import { promisify } from "util";
import { OpenSymbol } from "./data";
import { buildPdf, buildPng, buildSvg, colorLabel, parseColor, RenderOptions } from "./formats";
import { clipboardFolder, ensureTemplate, FrameMode, loadTemplate, Weight, WEIGHTS } from "./render";
import { prefs } from "./state";

const execFileAsync = promisify(execFile);

export const ALL_SIZES = [16, 24, 32, 48, 64, 128, 256, 512, 1024] as const;
export type ExportFormat = "png" | "svg" | "pdf" | "template";
export const ALL_FORMATS: ExportFormat[] = ["png", "svg", "pdf", "template"];
export const FORMAT_TITLES: Record<ExportFormat, string> = {
  png: "PNG",
  svg: "SVG",
  pdf: "PDF",
  template: "Custom Symbol Template",
};

export type ExportSettings = {
  size: number;
  weight: Weight;
  colorInput: string;
  frame: FrameMode;
  formats: ExportFormat[];
  folder: string;
};

function expandHome(p: string) {
  return p.startsWith("~") ? join(homedir(), p.slice(1)) : p;
}

/** Export settings from preferences, each falling back to a safe default. */
export function getExportSettings(): ExportSettings {
  const p = prefs();
  const size = Number(p.exportSize);
  const formats: ExportFormat[] = [];
  if (p.formatPng ?? true) formats.push("png");
  if (p.formatSvg) formats.push("svg");
  if (p.formatPdf) formats.push("pdf");
  if (p.formatTemplate) formats.push("template");
  return {
    size: (ALL_SIZES as readonly number[]).includes(size) ? size : 128,
    weight: WEIGHTS.includes(p.exportWeight as Weight) ? (p.exportWeight as Weight) : "regular",
    colorInput: p.exportColor?.trim() || "black",
    frame: p.exportFrame === "tight" ? "tight" : "square",
    formats: formats.length ? formats : ["png"],
    folder: resolve(expandHome(p.exportFolder?.trim() || "~/Downloads")),
  };
}

const renderOptions = (s: ExportSettings): RenderOptions => ({
  size: s.size,
  weight: s.weight,
  color: parseColor(s.colorInput),
  frame: s.frame,
});

/**
 * Everything goes straight into the chosen folder. File names record the size
 * and any setting that differs from the default, so exports with different
 * settings never overwrite each other: `lucide.heart-128px.png`,
 * `lucide.heart-128-bold-ff3b30.svg`. SF Symbol templates hold every weight
 * and are named for Xcode (`lucide.heart.svg`); the size in plain SVG names
 * keeps the two from clashing.
 */
function fileName(symbol: OpenSymbol, format: ExportFormat, s: ExportSettings) {
  if (format === "template") return `${symbol.xcodeName}.svg`;
  const parts = [
    symbol.xcodeName,
    `${s.size}${format === "png" ? "px" : format === "pdf" ? "pt" : ""}`,
    s.weight === "regular" ? "" : s.weight,
    s.frame === "tight" ? "tight" : "",
    // PNG and PDF can't inherit a CSS color, so currentColor renders black there.
    format !== "svg" && s.colorInput.trim().toLowerCase() === "currentcolor" ? "" : colorLabel(s.colorInput),
  ];
  return `${parts.filter(Boolean).join("-")}.${format}`;
}

export async function exportSymbols(symbols: OpenSymbol[], s: ExportSettings): Promise<string[]> {
  const files: string[] = [];
  const opts = renderOptions(s);
  await mkdir(s.folder, { recursive: true });
  for (const symbol of symbols) {
    const template = await loadTemplate(symbol);
    for (const format of s.formats) {
      const target = join(s.folder, fileName(symbol, format, s));
      if (format === "template") await copyFile(await ensureTemplate(symbol), target);
      if (format === "svg") await writeFile(target, buildSvg(symbol, template, opts), "utf8");
      if (format === "pdf") await writeFile(target, buildPdf(symbol, template, opts));
      if (format === "png") await writeFile(target, await buildPng(symbol, template, opts));
      files.push(target);
    }
  }
  return files;
}

const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));

export async function exportWithToast(symbols: OpenSymbol[], overrides: Partial<ExportSettings> = {}) {
  const s = { ...getExportSettings(), ...overrides };
  const label = symbols.length === 1 ? symbols[0].xcodeName : `${symbols.length} symbols`;
  const toast = await showToast({ style: Toast.Style.Animated, title: `Exporting ${label}…` });
  try {
    const files = await exportSymbols(symbols, s);
    const shown = files.length === 1 ? files[0] : s.folder;
    toast.style = Toast.Style.Success;
    // Name every format written, so it's clear at a glance what landed in the folder.
    const names = s.formats.map((f) => (f === "template" ? "Custom Symbol Template" : f.toUpperCase()));
    const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : names[0];
    toast.title = `Exported ${label} as ${list}`;
    toast.message = s.folder;
    toast.primaryAction = {
      title: "Show in Finder",
      shortcut: { modifiers: ["cmd"], key: "o" },
      onAction: (t) => {
        void showInFinder(shown);
        void t.hide();
      },
    };
    toast.secondaryAction = {
      title: "Copy Path",
      shortcut: Keyboard.Shortcut.Common.CopyPath,
      onAction: (t) => {
        void Clipboard.copy(shown);
        void t.hide();
      },
    };
  } catch (e) {
    toast.style = Toast.Style.Failure;
    toast.title = `Couldn't export ${label}`;
    toast.message = errorText(e);
  }
}

/**
 * Puts PNG data on the pasteboard (not a file reference), so it pastes into
 * Figma, Keynote, Slack and so on even after the temporary file is gone.
 */
export async function copyImageWithToast(symbol: OpenSymbol, overrides: Partial<ExportSettings> = {}) {
  const s = { ...getExportSettings(), ...overrides };
  const toast = await showToast({ style: Toast.Style.Animated, title: "Rendering image…" });
  try {
    const png = await buildPng(symbol, await loadTemplate(symbol), renderOptions(s));
    const tmp = join(clipboardFolder(), `${symbol.xcodeName}.png`);
    await mkdir(clipboardFolder(), { recursive: true });
    await writeFile(tmp, png);
    const posix = tmp.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    await execFileAsync("/usr/bin/osascript", [
      "-e",
      `set the clipboard to (read (POSIX file "${posix}") as «class PNGf»)`,
    ]);
    await toast.hide();
    await showHUD(`Copied ${symbol.xcodeName} image (${s.size} px)`);
  } catch (e) {
    toast.style = Toast.Style.Failure;
    toast.title = "Couldn't copy the image";
    toast.message = errorText(e);
  }
}

/** SVG markup on the clipboard: paste into code, or into Figma as an editable vector. */
export async function copySvgCodeWithToast(symbol: OpenSymbol) {
  const s = getExportSettings();
  try {
    const svg = buildSvg(symbol, await loadTemplate(symbol), renderOptions(s));
    await Clipboard.copy(svg);
    await showHUD(`Copied ${symbol.xcodeName} SVG`);
  } catch (e) {
    await showToast({ style: Toast.Style.Failure, title: "Couldn't copy the SVG", message: errorText(e) });
  }
}
