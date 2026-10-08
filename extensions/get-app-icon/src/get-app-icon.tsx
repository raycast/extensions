import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, mkdir, rmdir, stat, unlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { countOf, failToast, getErrorMessage, showError } from "@chrismessina/raycast-kit";
import { useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  Application,
  getApplications,
  getPreferenceValues,
  Grid,
  Icon,
  Keyboard,
  List,
  LocalStorage,
  showInFinder,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { invalidateCachedIcon, listCachedApps, pruneIconCache, refreshIconCache } from "./icon-cache";

// macOS-only system binaries for image processing and icon extraction.
// These are guaranteed to exist on every macOS installation.
const SIPS_PATH = "/usr/bin/sips";
const XCRUN_PATH = "/usr/bin/xcrun";

const DEFAULT_OUTPUT = "~/Downloads/";
const ALL_SIZES = [16, 32, 48, 64, 128, 256, 512, 1024] as const;

const execFileAsync = promisify(execFile);

type ExportedIcon = {
  size: number;
  filePath: string;
};

function normalizeOutputPath(inputPath: string): string {
  const rawPath = inputPath.trim() || DEFAULT_OUTPUT;
  const expanded = rawPath.startsWith("~") ? path.join(os.homedir(), rawPath.slice(1)) : rawPath;
  return path.resolve(expanded);
}

/**
 * macOS caps a single path component at 255 bytes. Names are truncated by BYTE length,
 * not character count, so a multi-byte name can't slip past the limit.
 */
const MAX_NAME_BYTES = 255;

/**
 * Shortens text to fit a byte budget, dropping whole characters so truncation can never
 * split a multi-byte character and leave invalid UTF-8 behind.
 */
function truncateToBytes(input: string, maxBytes: number): string {
  if (Buffer.byteLength(input, "utf8") <= maxBytes) return input;
  const chars = [...input];
  while (chars.length > 0 && Buffer.byteLength(chars.join(""), "utf8") > maxBytes) {
    chars.pop();
  }
  return chars.join("").trim();
}

/**
 * Turns arbitrary text into a usable single path component.
 *
 * Beyond the reserved characters, this strips control characters and clamps the length.
 * Neither is reachable from any app installed here — a survey of 304 real bundles found
 * no control characters and a longest version of 38 characters — but both come from a
 * bundle's own `Info.plist`, and the failure without a guard is an opaque `ENAMETOOLONG`
 * or `ERR_INVALID_ARG_VALUE` rather than an export that simply works.
 */
function sanitizeFolderName(input: string): string {
  const sanitized = input
    .replace(/[\\/:*?"<>|]/g, "-")
    // Control characters are legal in an Info.plist string but produce unusable
    // folder names (a NUL makes Node reject the path outright).
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim();
  if (!sanitized) return "Untitled";
  return truncateToBytes(sanitized, MAX_NAME_BYTES) || "Untitled";
}

type ExportFormat = "png" | "jpeg" | "icns";

/** Every format the extension can export, in menu order — not just the enabled ones. */
const ALL_FORMATS = ["png", "jpeg", "icns"] as const satisfies readonly ExportFormat[];

function getFormatLabel(format: ExportFormat): string {
  return format === "jpeg" ? "JPEG" : format.toUpperCase();
}

const DEFAULT_SIZE = 512;

/** The single size used by "Export Icons". Falls back to 512 if the stored value isn't one we offer. */
function getDefaultExportSize(prefs: ExtensionPreferences): number {
  const parsed = Number(prefs.defaultExportSize);
  return ALL_SIZES.includes(parsed as (typeof ALL_SIZES)[number]) ? parsed : DEFAULT_SIZE;
}

function getEnabledFormats(prefs: ExtensionPreferences): readonly ExportFormat[] {
  const formats: ExportFormat[] = [];
  if (prefs.formatPng) formats.push("png");
  if (prefs.formatJpeg) formats.push("jpeg");
  if (prefs.formatIcns) formats.push("icns");
  return formats.length > 0 ? formats : ["png"];
}

function getFileExtension(format: ExportFormat): string {
  return format === "jpeg" ? "jpg" : format;
}

function getFormatSubdir(format: ExportFormat): string {
  return format.toUpperCase();
}

/**
 * The app's marketing version (`CFBundleShortVersionString`), or null when the bundle
 * doesn't declare one.
 *
 * Only the short version is used. `CFBundleVersion` is a build number that changes on
 * every internal build, which would scatter folders for what a user thinks of as one
 * release. Every real bundle surveyed carried a short version; the null path is for
 * malformed bundles with no readable `Info.plist`.
 */
async function getAppVersion(appPath: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("/usr/bin/plutil", [
      "-extract",
      "CFBundleShortVersionString",
      "raw",
      "-o",
      "-",
      path.join(appPath, "Contents", "Info.plist"),
    ]);
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Folder name for an app's export, including its version when one is available.
 *
 * Versioning the folder is what keeps a re-export from silently replacing an earlier
 * one: exports overwrite by path, so "Bleep App Icons" would hand back 3.4.0's icons
 * under the name the 3.3.1 icons were saved as. Separate versions mean separate folders,
 * and re-exporting the *same* version still overwrites — which is the intended repair
 * path for a partial or interrupted export.
 *
 * Uniqueness of the *version* is the invariant, so the app NAME absorbs any shortening.
 * Truncating the assembled label instead cuts the version off the end, collapsing two
 * versions onto one folder — the silent overwrite this function exists to prevent.
 *
 * A version too long to fit even on its own is replaced by a truncated form plus a digest
 * of the full string. Two releases differing only in their tail (`…aaa` vs `…aab`) would
 * otherwise share a folder; the digest keeps them apart at the cost of readability, which
 * is the right trade when the alternative is losing an export.
 */
const VERSION_DIGEST_BYTES = 12;

function getAppFolderName(app: Application, version?: string | null): string {
  const suffix = " App Icons";
  const sanitizedName = sanitizeFolderName(app.name);
  if (!version) {
    const nameOnly = truncateToBytes(sanitizedName, MAX_NAME_BYTES - Buffer.byteLength(suffix, "utf8"));
    return sanitizeFolderName(`${nameOnly}${suffix}`);
  }

  // Fixed cost: the suffix plus the single space between name and version.
  const fixedBytes = Buffer.byteLength(suffix, "utf8") + 1;
  // Leave at least one byte for the name so the folder never becomes version-only.
  const versionBudget = MAX_NAME_BYTES - fixedBytes - 1;

  let sanitizedVersion = sanitizeFolderName(version);
  if (Buffer.byteLength(sanitizedVersion, "utf8") > versionBudget) {
    const digest = createHash("sha256").update(version).digest("hex").slice(0, VERSION_DIGEST_BYTES);
    const head = truncateToBytes(sanitizedVersion, Math.max(versionBudget - (VERSION_DIGEST_BYTES + 1), 1));
    sanitizedVersion = truncateToBytes(`${head}-${digest}`, versionBudget);
  }

  const nameBudget = MAX_NAME_BYTES - Buffer.byteLength(sanitizedVersion, "utf8") - fixedBytes;
  const name = truncateToBytes(sanitizedName, Math.max(nameBudget, 1));
  return sanitizeFolderName(`${name} ${sanitizedVersion}${suffix}`);
}

function escapeStringLiteral(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * Extracts an app icon to a file using macOS NSWorkspace.
 * Works for ALL apps regardless of icon format (.icns, Asset Catalog, etc.)
 * by leveraging the same system icon resolution that Finder uses.
 */
async function extractAppIconToFile(appPath: string, outputPath: string, size: number): Promise<void> {
  const safeAppPath = escapeStringLiteral(appPath);
  const safeOutputPath = escapeStringLiteral(outputPath);
  const script = [
    "import AppKit",
    `let icon = NSWorkspace.shared.icon(forFile: "${safeAppPath}")`,
    `let s = ${size}`,
    "icon.size = NSSize(width: s, height: s)",
    "let bmp = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: s, pixelsHigh: s, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!",
    "NSGraphicsContext.saveGraphicsState()",
    "NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bmp)",
    "icon.draw(in: NSRect(x: 0, y: 0, width: s, height: s), from: .zero, operation: .copy, fraction: 1.0)",
    "NSGraphicsContext.restoreGraphicsState()",
    "let data = bmp.representation(using: .png, properties: [:])!",
    `try data.write(to: URL(fileURLWithPath: "${safeOutputPath}"))`,
  ].join("\n");
  await execFileAsync(XCRUN_PATH, ["swift", "-e", script]);
}

/**
 * Tries to find the .icns icon file for a macOS application bundle.
 * Returns the path if found, or null if the app uses Asset Catalog icons.
 */
async function findIcnsPath(appPath: string): Promise<string | null> {
  const plistPath = path.join(appPath, "Contents", "Info.plist");
  try {
    const { stdout } = await execFileAsync("/usr/bin/plutil", [
      "-extract",
      "CFBundleIconFile",
      "raw",
      "-o",
      "-",
      plistPath,
    ]);
    let iconName = stdout.trim();
    if (!iconName) iconName = "AppIcon";
    const iconFile = iconName.endsWith(".icns") ? iconName : `${iconName}.icns`;
    const fullPath = path.join(appPath, "Contents", "Resources", iconFile);
    await stat(fullPath);
    return fullPath;
  } catch {
    return null;
  }
}

/**
 * Copies an app icon to the clipboard as an image.
 *
 * The image DATA goes on the pasteboard, not a file reference. `Clipboard.copy({ file })`
 * writes a `public.file-url`, which pastes as an image only while that file still exists —
 * so a temp file we clean up afterwards leaves the clipboard pointing at a deleted path and
 * apps paste the path as text instead. Writing `public.png` + `public.tiff` means the bytes
 * are on the pasteboard and the temp file can go away immediately.
 */
async function copyIconToClipboard(app: Application, size: number): Promise<void> {
  const tmpFile = path.join(os.tmpdir(), `${sanitizeFolderName(app.name)}-${size}.png`);
  await extractAppIconToFile(app.path, tmpFile, size);
  try {
    const script = [
      "import AppKit",
      `let path = "${escapeStringLiteral(tmpFile)}"`,
      "guard let image = NSImage(contentsOfFile: path), let tiff = image.tiffRepresentation,",
      "      let rep = NSBitmapImageRep(data: tiff),",
      "      let png = rep.representation(using: .png, properties: [:])",
      'else { FileHandle.standardError.write("could not read extracted icon".data(using: .utf8)!); exit(1) }',
      "let pasteboard = NSPasteboard.general",
      "pasteboard.clearContents()",
      "pasteboard.setData(png, forType: .png)",
      "pasteboard.setData(tiff, forType: .tiff)",
    ].join("\n");
    await execFileAsync(XCRUN_PATH, ["swift", "-e", script]);
  } finally {
    // Safe to remove now: the pixels live on the pasteboard, not in this file.
    await unlink(tmpFile).catch(() => {});
  }
}

type ExportResult = {
  outputDir: string;
  results: ExportedIcon[];
  warnings: string[];
};

/**
 * Exports icons for a single format into its own subdirectory.
 */
async function exportIconsForFormat(
  app: Application,
  sizes: readonly number[],
  appOutputDir: string,
  format: ExportFormat,
): Promise<ExportedIcon[]> {
  const formatDir = path.join(appOutputDir, getFormatSubdir(format));

  // ICNS format: copy the original .icns file if available.
  // The directory is created only once there's a file to put in it — creating it up
  // front left an empty ICNS/ folder behind for every Asset Catalog app, which reads
  // as a silent failure in Finder.
  if (format === "icns") {
    const icnsPath = await findIcnsPath(app.path);
    if (!icnsPath) {
      throw new Error(`${app.name} does not have an .icns file (Asset Catalog icons). Try PNG instead.`);
    }
    await mkdir(formatDir, { recursive: true });
    const filePath = path.join(formatDir, `${sanitizeFolderName(app.name)}.icns`);
    await copyFile(icnsPath, filePath);
    return [{ size: 0, filePath }];
  }

  const ext = getFileExtension(format);
  await mkdir(formatDir, { recursive: true });

  // PNG/JPEG: extract icons via NSWorkspace (works for all apps)
  return Promise.all(
    sizes.map(async (size): Promise<ExportedIcon> => {
      const pngPath = path.join(formatDir, `${sanitizeFolderName(app.name)}-${size}.png`);
      await extractAppIconToFile(app.path, pngPath, size);

      // Convert to JPEG if needed
      if (format === "jpeg") {
        const jpgPath = path.join(formatDir, `${sanitizeFolderName(app.name)}-${size}.${ext}`);
        await execFileAsync(SIPS_PATH, ["-s", "format", "jpeg", pngPath, "--out", jpgPath]);
        await unlink(pngPath);
        return { size, filePath: jpgPath };
      }

      return { size, filePath: pngPath };
    }),
  );
}

/**
 * Exports icons in all enabled formats, each into its own subdirectory.
 * Failures in one format do not block other formats from exporting.
 */
async function exportIcons(
  app: Application,
  sizes: readonly number[],
  baseOutputPath: string,
  formats: readonly ExportFormat[],
): Promise<ExportResult> {
  const version = await getAppVersion(app.path);
  const outputDir = path.join(normalizeOutputPath(baseOutputPath), getAppFolderName(app, version));
  // `mkdir` with `recursive` returns the first directory it created, or undefined when the
  // path already existed. That distinction is what licenses the cleanup below: we may only
  // remove a folder this export brought into being.
  const createdDir = await mkdir(outputDir, { recursive: true });

  const allResults: ExportedIcon[] = [];
  const warnings: string[] = [];
  for (const format of formats) {
    try {
      const results = await exportIconsForFormat(app, sizes, outputDir, format);
      allResults.push(...results);
    } catch (error) {
      warnings.push(`${format.toUpperCase()}: ${getErrorMessage(error)}`);
      // A format that failed partway (icon extraction died after its directory was made)
      // would otherwise leave an empty PNG/ or JPEG/ behind — which also blocks the
      // whole-folder cleanup below, since `rmdir` refuses a non-empty directory.
      await rmdir(path.join(outputDir, getFormatSubdir(format))).catch(() => {});
    }
  }

  if (allResults.length === 0 && warnings.length > 0) {
    // Nothing was written, so don't leave a bare folder behind advertising an export that
    // didn't happen — but only clean up a folder this export created. A folder that was
    // already there is the user's, even when it's empty, and deleting it would be reaching
    // outside what an export is allowed to touch. `rmdir` additionally refuses a non-empty
    // directory, so a previous export's files are never at risk either way.
    if (createdDir) await rmdir(outputDir).catch(() => {});
    throw new Error(warnings.join("\n"));
  }

  return { outputDir, results: allResults, warnings };
}

/**
 * Runs an export operation with standardized toast feedback.
 * Shows an animated toast during export, then success or failure.
 */
async function exportWithToast(
  app: Application,
  sizes: readonly number[],
  outputPath: string,
  formats: readonly ExportFormat[],
): Promise<void> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Exporting ${app.name} icons...`,
  });
  try {
    const { outputDir, results, warnings } = await exportIcons(app, sizes, outputPath, formats);
    // Exports read the live bundle, so a successful one proves what the icon looks
    // like now. Drop the cached tile so a stale grid entry re-extracts next visit.
    await invalidateCachedIcon(app.path);
    toast.style = Toast.Style.Success;
    toast.title = `Exported ${countOf(results.length, "icon", { zero: "no icons" })}`;
    toast.message = warnings.length > 0 ? `${outputDir}\n⚠ ${warnings.join("; ")}` : outputDir;
    // The shortcut is explicit on purpose. `Toast.ActionOptions` accepts one, and without
    // it the success toast rendered with no visible affordance at all — the action existed
    // but nothing on screen said so, which reads as "the export gave me nowhere to go".
    // Every export path funnels through here, so this covers Export Icons, Export Icon
    // Size…, Export Icons As…, and Export All Sizes in one place.
    toast.primaryAction = {
      title: "Reveal in Finder",
      shortcut: { modifiers: ["cmd"], key: "o" },
      onAction: (t) => {
        void showInFinder(outputDir);
        void t.hide();
      },
    };
  } catch (error) {
    failToast(toast, error, { title: `Failed to export ${app.name}'s icons` });
  }
}

type ViewMode = "list" | "grid";
const VIEW_MODE_KEY = "viewMode";

function AppActions({
  app,
  defaultSize,
  formats,
  preferences,
  viewMode,
  setViewMode,
}: {
  app: Application;
  defaultSize: number;
  formats: readonly ExportFormat[];
  preferences: ExtensionPreferences;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}) {
  // ICNS copies the whole multi-size .icns file and ignores `sizes`, so it can't honour a
  // single-size request. Drop it here, falling back to PNG if it was the only format enabled.
  const rasterFormats = formats.filter((format) => format !== "icns");
  const sizedFormats: readonly ExportFormat[] = rasterFormats.length > 0 ? rasterFormats : ["png"];

  return (
    <ActionPanel>
      <ActionPanel.Section title="Export">
        <Action
          title="Export Icons"
          icon={Icon.Download}
          // ⌘E matches Common.Edit's chord, but exporting isn't editing — a wrong
          // semantic match is worse than an honest custom shortcut.
          // eslint-disable-next-line @raycast/prefer-common-shortcut
          shortcut={{ modifiers: ["cmd"], key: "e" }}
          onAction={() => exportWithToast(app, [defaultSize], preferences.outputPath, formats)}
        />
        <ActionPanel.Submenu title="Export Icon Size…" icon={Icon.Download}>
          {ALL_SIZES.map((size) => (
            <Action
              key={size}
              // eslint-disable-next-line @raycast/prefer-title-case
              title={`${size} x ${size}`}
              icon={Icon.Download}
              onAction={() => exportWithToast(app, [size], preferences.outputPath, sizedFormats)}
            />
          ))}
        </ActionPanel.Submenu>
        {/* "As" is already correct title case here; the rule flags the short word. */}
        {/* eslint-disable-next-line @raycast/prefer-title-case */}
        <ActionPanel.Submenu title="Export Icons As…" icon={Icon.Download}>
          {ALL_FORMATS.map((format) => (
            <Action
              key={format}
              title={getFormatLabel(format)}
              icon={Icon.Download}
              // A one-off format override: exports the same sizes "Export Icons" would,
              // in just this format, without touching the format preferences. ICNS carries
              // every size in one file, so the size list it gets doesn't matter.
              onAction={() => exportWithToast(app, [defaultSize], preferences.outputPath, [format])}
            />
          ))}
        </ActionPanel.Submenu>
        <Action
          title="Export All Sizes"
          icon={Icon.Download}
          shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
          onAction={() => exportWithToast(app, [...ALL_SIZES], preferences.outputPath, formats)}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Copy">
        <Action
          title="Copy Icon"
          icon={Icon.Clipboard}
          shortcut={Keyboard.Shortcut.Common.Copy}
          onAction={async () => {
            const toast = await showToast({
              style: Toast.Style.Animated,
              title: `Copying ${defaultSize} x ${defaultSize} icon...`,
            });
            try {
              await copyIconToClipboard(app, defaultSize);
              toast.style = Toast.Style.Success;
              toast.title = `Copied ${defaultSize} x ${defaultSize} icon`;
            } catch (error) {
              failToast(toast, error, { title: "Failed to copy icon" });
            }
          }}
        />
        <ActionPanel.Submenu title="Copy Icon Size…" icon={Icon.Clipboard}>
          {ALL_SIZES.map((size) => (
            <Action
              key={size}
              // eslint-disable-next-line @raycast/prefer-title-case
              title={`${size} x ${size}`}
              icon={Icon.Clipboard}
              onAction={async () => {
                const toast = await showToast({
                  style: Toast.Style.Animated,
                  title: `Copying ${size} x ${size} icon...`,
                });
                try {
                  await copyIconToClipboard(app, size);
                  toast.style = Toast.Style.Success;
                  toast.title = `Copied ${size} x ${size} icon`;
                } catch (error) {
                  failToast(toast, error, { title: `Failed to copy ${size} x ${size} icon` });
                }
              }}
            />
          ))}
        </ActionPanel.Submenu>
        <Action.CopyToClipboard
          title="Copy App Path"
          icon={Icon.Clipboard}
          content={app.path}
          shortcut={Keyboard.Shortcut.Common.CopyPath}
        />
        <Action.CopyToClipboard
          title="Copy App Name"
          icon={Icon.Clipboard}
          content={app.name}
          shortcut={Keyboard.Shortcut.Common.CopyName}
        />
        {app.bundleId && (
          <Action.CopyToClipboard title="Copy Bundle Identifier" icon={Icon.Tag} content={app.bundleId} />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section title="View">
        {viewMode === "list" ? (
          <Action
            title="View as Grid"
            icon={Icon.AppWindowGrid3x3}
            shortcut={{ modifiers: ["cmd"], key: "g" }}
            onAction={() => setViewMode("grid")}
          />
        ) : (
          <Action
            title="View as List"
            icon={Icon.List}
            shortcut={{ modifiers: ["cmd"], key: "l" }}
            onAction={() => setViewMode("list")}
          />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section title="App">
        {/* No explicit shortcut: Raycast reserves ⌘↩ for the panel's secondary action. */}
        <Action.ShowInFinder path={app.path} />
        <Action
          title="Show Info in Finder"
          icon={Icon.Finder}
          shortcut={{ modifiers: ["cmd"], key: "i" }}
          onAction={async () => {
            try {
              await execFileAsync("/usr/bin/open", ["-R", "-a", "Finder", app.path]);
              await execFileAsync("/usr/bin/osascript", [
                "-e",
                `tell application "Finder" to open information window of (POSIX file "${escapeStringLiteral(app.path)}" as alias)`,
              ]);
            } catch (error) {
              await showError(error, { title: "Failed to show info in Finder" });
            }
          }}
        />
        <Action
          title="Show Export Folder in Finder"
          icon={Icon.Folder}
          shortcut={{ modifiers: ["cmd"], key: "f" }}
          onAction={async () => {
            const outputRoot = normalizeOutputPath(preferences.outputPath);
            // Check the installed version's folder first, then the unversioned name that
            // exports created before folders carried versions, so an older export is still
            // reachable from this action rather than looking like it was never made.
            const version = await getAppVersion(app.path);
            const candidates = version
              ? [getAppFolderName(app, version), getAppFolderName(app, null)]
              : [getAppFolderName(app, null)];
            for (const candidate of candidates) {
              const folderPath = path.join(outputRoot, candidate);
              try {
                await stat(folderPath);
                await showInFinder(folderPath);
                return;
              } catch {
                // Not this one — try the next, then fall through to the output folder.
              }
            }
            // Opening the parent beats a dead end: the user asked to see where icons
            // go, and that place exists even when this app hasn't been exported.
            try {
              await showInFinder(outputRoot);
              await showToast({
                style: Toast.Style.Success,
                title: `No icons exported for ${app.name} yet`,
                message: `Opened ${path.basename(outputRoot)} instead`,
              });
            } catch (error) {
              await showError(error, { title: "Couldn't Open Export Folder" });
            }
          }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

export default function Command() {
  const preferences = getPreferenceValues<ExtensionPreferences>();
  const defaultSize = getDefaultExportSize(preferences);
  const formats = getEnabledFormats(preferences);

  const defaultViewMode: ViewMode = preferences.defaultViewMode === "grid" ? "grid" : "list";
  const [viewMode, setViewModeState] = useState<ViewMode>(defaultViewMode);
  const [viewLoaded, setViewLoaded] = useState(false);

  useEffect(() => {
    LocalStorage.getItem<string>(VIEW_MODE_KEY).then((stored) => {
      if (stored === "list" || stored === "grid") {
        setViewModeState(stored);
      }
      setViewLoaded(true);
    });
  }, []);

  function setViewMode(mode: ViewMode) {
    setViewModeState(mode);
    LocalStorage.setItem(VIEW_MODE_KEY, mode);
  }

  const { data: apps, isLoading } = usePromise(async () => {
    const results = await getApplications();
    return results.sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const loading = isLoading || !viewLoaded;

  // Grid tiles render far larger than the 32pt image `fileIcon` resolves to, so they
  // look soft. Extract real 256px icons to a cache and point the tiles at those. Only
  // the grid needs this — list rows are close enough to `fileIcon`'s nominal size.
  // Maps an app to the cache file to render for it. The filename encodes the source state
  // it was drawn from, so it can only come from a resolver that looked — the grid can no
  // longer derive it, which is what keeps the tile and the freshness check in agreement.
  const [cachedApps, setCachedApps] = useState<ReadonlyMap<string, string>>(new Map());
  useEffect(() => {
    if (viewMode !== "grid" || !apps || apps.length === 0) return;

    let cancelled = false;
    // Leaving the grid kills the extractor rather than letting it finish work nobody
    // is waiting for.
    const controller = new AbortController();
    const appPaths = apps.map((app) => app.path);

    (async () => {
      let toast: Toast | undefined;
      // What the grid last published, so the cleanup below can spare those files.
      let rendered: ReadonlyMap<string, string> | undefined;
      try {
        // Show whatever is already cached before doing any work, so a warm cache
        // renders sharp immediately.
        const warm = await listCachedApps(appPaths);
        if (cancelled) return;
        setCachedApps(warm);
        // Pin as soon as it is on screen, not after the refresh. Extraction can abort or
        // fail in between, and the cleanup below would then see no pinned entries and
        // happily delete the very files these tiles point at.
        rendered = warm;

        await refreshIconCache(
          appPaths,
          (done, total) => {
            if (cancelled || total === 0) return;
            if (!toast) {
              // Fire the indicator before the work, not after — a silent multi-second
              // pause on first run reads as a stall.
              toast = new Toast({ style: Toast.Style.Animated, title: "Preparing icons…" });
              void toast.show();
            }
            toast.message = `${done} of ${countOf(total, "icon")}`;
          },
          controller.signal,
        );
        if (cancelled) return;

        // Re-resolve unconditionally, not only when something was extracted. A cache
        // entry's name encodes the source state it was drawn from, so paths resolved
        // before extraction can be superseded by an app updating meanwhile — even when
        // this pass wrote nothing. Rendering a superseded name would show a tile whose
        // file prune is entitled to collect.
        const refreshed = await listCachedApps(appPaths);
        if (cancelled) return;
        setCachedApps(refreshed);
        rendered = refreshed;
      } catch (error) {
        // An aborted extraction is a view change, not a failure worth a toast.
        if (!cancelled) {
          // The grid stays on the system icons, so this is soft-fail: say so rather
          // than leaving the user wondering why the icons never sharpened.
          await showError(error, { title: "Couldn't Sharpen Grid Icons" });
        }
      } finally {
        // Always retire the progress toast — leaving "Preparing icons…" on screen
        // after the work stops is the UI lying about its state.
        await toast?.hide();
        // Prune here, not on the success path. Every early return above sits before it, so
        // abandoning the grid used to skip collection entirely — and because an entry's
        // name encodes source state, each abandoned visit could strand another superseded
        // entry for any app that changed meanwhile, with nothing collecting them until a
        // visit happened to run to completion. Measured: 33 of 327 apps changed within a
        // day, so a churny session could strand tens of MB.
        //
        // Whatever the grid last published is passed as in-use, so this can never delete
        // the file a rendered tile points at.
        await pruneIconCache(appPaths, rendered?.values() ?? []).catch(() => {});
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [viewMode, apps]);

  const actionProps = { defaultSize, formats, preferences, viewMode, setViewMode };

  if (viewMode === "grid") {
    return (
      <Grid isLoading={loading} columns={5} inset={Grid.Inset.Large} searchBarPlaceholder="Search applications">
        {!loading && apps?.length === 0 && (
          <Grid.EmptyView
            icon={Icon.AppWindowList}
            title="No Applications Found"
            description="No installed applications were detected on this Mac."
          />
        )}
        {apps?.map((app) => {
          // The cached 256px PNG renders sharp. `Image.Fallback` can't hold a FileIcon, so
          // pick the source directly: apps not yet cached (or that the extractor couldn't
          // handle) keep the soft-but-present system icon.
          const cached = cachedApps.get(app.path);
          return (
            <Grid.Item
              key={app.path}
              content={cached ? { source: cached } : { fileIcon: app.path }}
              title={app.name}
              keywords={app.bundleId ? [app.bundleId] : []}
              actions={<AppActions app={app} {...actionProps} />}
            />
          );
        })}
      </Grid>
    );
  }

  return (
    <List isLoading={loading} searchBarPlaceholder="Search applications">
      {!loading && apps?.length === 0 && (
        <List.EmptyView
          icon={Icon.AppWindowList}
          title="No Applications Found"
          description="No installed applications were detected on this Mac."
        />
      )}
      {apps?.map((app) => (
        <List.Item
          key={app.path}
          title={app.name}
          subtitle={path.basename(path.dirname(app.path))}
          icon={{ fileIcon: app.path }}
          accessories={app.bundleId ? [{ text: app.bundleId, tooltip: "Bundle Identifier" }] : []}
          actions={<AppActions app={app} {...actionProps} />}
        />
      ))}
    </List>
  );
}
