import { copyFile, mkdir, mkdtemp, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { countOf, failToast } from "@chrismessina/raycast-kit";
import { Clipboard, getPreferenceValues, Keyboard, showInFinder, showToast, Toast } from "@raycast/api";
import { execFileAsync, runCLI, SFSymbolsApp } from "./sfsymbols-cli";

// Adapted from the Get App Icon extension's export path (normalizeOutputPath, exportWithToast,
// copyIconToClipboard), which is already in the Store. Rendering goes through the SF Symbols CLI
// instead of NSWorkspace; the toast, clipboard and folder handling are unchanged.

const XCRUN_PATH = "/usr/bin/xcrun";
const DEFAULT_OUTPUT = "~/Downloads/";

export const ALL_SIZES = [16, 32, 64, 128, 256, 512, 1024] as const;
export const ALL_WEIGHTS = [
  "ultralight",
  "thin",
  "light",
  "regular",
  "medium",
  "semibold",
  "bold",
  "heavy",
  "black",
] as const;

export type ExportFormat = "png" | "pdf" | "svg";
export type Weight = (typeof ALL_WEIGHTS)[number];

/** Every format the extension can export, in menu order — not just the enabled ones. */
export const ALL_FORMATS = ["png", "pdf", "svg"] as const satisfies readonly ExportFormat[];

const DEFAULT_SIZE = 128;

export type ExportSettings = {
  size: number;
  weight: Weight;
  formats: readonly ExportFormat[];
  color: string;
  renderingMode: string;
  outputPath: string;
};

export function getFormatLabel(format: ExportFormat): string {
  return format.toUpperCase();
}

export function capitalize(word: string): string {
  return word[0].toUpperCase() + word.slice(1);
}

export function getWeightLabel(weight: Weight): string {
  return capitalize(weight);
}

function normalizeOutputPath(inputPath: string): string {
  const rawPath = inputPath.trim() || DEFAULT_OUTPUT;
  const expanded = rawPath.startsWith("~") ? path.join(os.homedir(), rawPath.slice(1)) : rawPath;
  return path.resolve(expanded);
}

/** Export settings from preferences, each falling back to a safe default if the stored value isn't one we offer. */
export function getExportSettings(): ExportSettings {
  const prefs = getPreferenceValues<ExtensionPreferences>();
  const parsedSize = Number(prefs.defaultExportSize);
  const size = ALL_SIZES.includes(parsedSize as (typeof ALL_SIZES)[number]) ? parsedSize : DEFAULT_SIZE;
  const weight = ALL_WEIGHTS.includes(prefs.exportWeight as Weight) ? (prefs.exportWeight as Weight) : "regular";
  const formats: ExportFormat[] = [];
  if (prefs.formatPng) formats.push("png");
  if (prefs.formatPdf) formats.push("pdf");
  if (prefs.formatSvg) formats.push("svg");
  return {
    size,
    weight,
    formats: formats.length > 0 ? formats : ["png"],
    color: prefs.exportColor?.trim() || "black",
    renderingMode: prefs.exportRenderingMode || "monochrome",
    outputPath: prefs.outputPath,
  };
}

/**
 * The file name a symbol is saved under. SVG is Apple's editable symbol template, which holds every
 * weight, scale and color in one file, so its name carries none of them. PNG and PDF are renderings
 * of one size, weight, rendering mode and color; the name records every setting that differs from
 * the default, so exporting with different settings never overwrites an earlier export.
 * `trash-128pt.png`, `trash-128pt-bold-hierarchical-ff3b30.png`.
 */
function exportFileName(name: string, format: ExportFormat, settings: ExportSettings): string {
  if (format === "svg") return `${name}.svg`;
  const color = settings.color.toLowerCase().replace(/[^a-z0-9]/g, "");
  const parts = [
    name,
    `${settings.size}pt`,
    settings.weight === "regular" ? "" : settings.weight,
    settings.renderingMode === "monochrome" ? "" : settings.renderingMode,
    color === "black" ? "" : color,
  ];
  return `${parts.filter(Boolean).join("-")}.${format}`;
}

function renderArgs(settings: Pick<ExportSettings, "size" | "weight" | "color" | "renderingMode">): string[] {
  return [
    "--point-size",
    String(settings.size),
    "--weight",
    settings.weight,
    "--color",
    settings.color,
    "--rendering-mode",
    settings.renderingMode,
  ];
}

type ExportResult = { outputDir: string; files: string[] };

/**
 * Exports symbols in every requested format into `<Output Folder>/SF Symbols/`.
 *
 * The CLI names files `<symbol>.<ext>`, so each format renders into a private staging folder and
 * its files are copied out under names that include the render settings. A name is never written
 * until its file is complete.
 */
async function exportSymbols(
  app: SFSymbolsApp,
  names: readonly string[],
  formats: readonly ExportFormat[],
  settings: ExportSettings,
): Promise<ExportResult> {
  const outputDir = path.join(normalizeOutputPath(settings.outputPath), "SF Symbols");
  await mkdir(outputDir, { recursive: true });
  const files: string[] = [];
  const staging = await mkdtemp(path.join(os.tmpdir(), "sf-symbols-export-"));
  try {
    for (const format of formats) {
      const formatDir = path.join(staging, format);
      await mkdir(formatDir);
      await runCLI(app, [
        "export",
        ...names,
        "--format",
        format,
        "--output-dir",
        formatDir,
        "--quiet",
        ...(format === "svg" ? [] : renderArgs(settings)),
      ]);
      for (const entry of await readdir(formatDir)) {
        const name = entry.slice(0, -(format.length + 1));
        const destination = path.join(outputDir, exportFileName(name, format, settings));
        await copyFile(path.join(formatDir, entry), destination);
        files.push(destination);
      }
    }
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
  return { outputDir, files };
}

/**
 * Runs an export with standardized toast feedback: animated while it works, then success with
 * Show in Finder and Copy Path, or a failure toast with Copy Error.
 */
export async function exportWithToast(
  app: SFSymbolsApp,
  names: readonly string[],
  overrides: Partial<ExportSettings> = {},
): Promise<void> {
  const settings = { ...getExportSettings(), ...overrides };
  const label = names.length === 1 ? names[0] : countOf(names.length, "symbol");
  const toast = await showToast({ style: Toast.Style.Animated, title: `Exporting ${label}…` });
  try {
    const { outputDir, files } = await exportSymbols(app, names, settings.formats, settings);
    const shown = files.length === 1 ? files[0] : outputDir;
    toast.style = Toast.Style.Success;
    toast.title =
      files.length === 1 ? `Exported ${path.basename(files[0])}` : `Exported ${countOf(files.length, "file")}`;
    toast.message = outputDir;
    // The shortcuts are explicit on purpose: a toast action without one is reachable only by
    // mouse before the toast expires.
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
  } catch (error) {
    failToast(toast, error, { title: `Failed to export ${label}` });
  }
}

function escapeStringLiteral(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * Copies a rendered symbol to the clipboard as an image.
 *
 * The image DATA goes on the pasteboard, not a file reference. `Clipboard.copy({ file })` writes a
 * `public.file-url`, which pastes as an image only while that file still exists, so a temp file we
 * clean up afterward leaves the clipboard pointing at a deleted path. Writing `public.png` +
 * `public.tiff` means the bytes are on the pasteboard and the temp file can go away immediately.
 */
async function copySymbolImage(app: SFSymbolsApp, name: string, settings: ExportSettings): Promise<void> {
  const staging = await mkdtemp(path.join(os.tmpdir(), "sf-symbols-copy-"));
  const tmpFile = path.join(staging, `${name}.png`);
  try {
    await runCLI(app, ["export", name, "--format", "png", "--output", tmpFile, ...renderArgs(settings)]);
    const script = [
      "import AppKit",
      `let path = "${escapeStringLiteral(tmpFile)}"`,
      "guard let image = NSImage(contentsOfFile: path), let tiff = image.tiffRepresentation,",
      "      let rep = NSBitmapImageRep(data: tiff),",
      "      let png = rep.representation(using: .png, properties: [:])",
      'else { FileHandle.standardError.write("could not read rendered symbol".data(using: .utf8)!); exit(1) }',
      "let pasteboard = NSPasteboard.general",
      "pasteboard.clearContents()",
      "pasteboard.setData(png, forType: .png)",
      "pasteboard.setData(tiff, forType: .tiff)",
    ].join("\n");
    await execFileAsync(XCRUN_PATH, ["swift", "-e", script]);
  } finally {
    // Safe to remove now: the pixels live on the pasteboard, not in this file.
    await rm(staging, { recursive: true, force: true });
  }
}

export async function copyImageWithToast(
  app: SFSymbolsApp,
  name: string,
  overrides: Partial<ExportSettings> = {},
): Promise<void> {
  const settings = { ...getExportSettings(), ...overrides };
  const toast = await showToast({ style: Toast.Style.Animated, title: `Copying ${name} at ${settings.size} pt…` });
  try {
    await copySymbolImage(app, name, settings);
    toast.style = Toast.Style.Success;
    toast.title = `Copied ${name} at ${settings.size} pt`;
  } catch (error) {
    failToast(toast, error, { title: `Failed to copy ${name}` });
  }
}
