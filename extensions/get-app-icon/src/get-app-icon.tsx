import {
  Action,
  ActionPanel,
  Application,
  Clipboard,
  Grid,
  Icon,
  List,
  LocalStorage,
  Toast,
  getApplications,
  getPreferenceValues,
  showInFinder,
  showToast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { execFile } from "node:child_process";
import { copyFile, mkdir, stat, unlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

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

function sanitizeFolderName(input: string): string {
  const sanitized = input.replace(/[\\/:*?"<>|]/g, "-").trim();
  return sanitized || "Untitled";
}

type ExportFormat = "png" | "jpeg" | "icns";

function pluralize(count: number, singular: string, plural?: string): string {
  if (count === 0) return `no ${plural ?? singular + "s"}`;
  if (count === 1) return `${count} ${singular}`;
  return `${count} ${plural ?? singular + "s"}`;
}

function getEnabledSizes(prefs: ExtensionPreferences): readonly number[] {
  const sizes = ALL_SIZES.filter((s) => prefs[`size${s}` as keyof ExtensionPreferences]);
  return sizes.length > 0 ? sizes : [512];
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

function getAppFolderName(app: Application): string {
  return sanitizeFolderName(`${app.name} App Icons`);
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

async function copyIconToClipboard(app: Application, size: number): Promise<void> {
  const tmpFile = path.join(os.tmpdir(), `${sanitizeFolderName(app.name)}-${size}.png`);
  await extractAppIconToFile(app.path, tmpFile, size);
  try {
    await Clipboard.copy({ file: tmpFile });
  } finally {
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
  await mkdir(formatDir, { recursive: true });

  // ICNS format: copy the original .icns file if available
  if (format === "icns") {
    const icnsPath = await findIcnsPath(app.path);
    if (!icnsPath) {
      throw new Error(`${app.name} does not have an .icns file (Asset Catalog icons). Try PNG instead.`);
    }
    const filePath = path.join(formatDir, `${sanitizeFolderName(app.name)}.icns`);
    await copyFile(icnsPath, filePath);
    return [{ size: 0, filePath }];
  }

  const ext = getFileExtension(format);

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
  const outputDir = path.join(normalizeOutputPath(baseOutputPath), getAppFolderName(app));
  await mkdir(outputDir, { recursive: true });

  const allResults: ExportedIcon[] = [];
  const warnings: string[] = [];
  for (const format of formats) {
    try {
      const results = await exportIconsForFormat(app, sizes, outputDir, format);
      allResults.push(...results);
    } catch (error) {
      warnings.push(`${format.toUpperCase()}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (allResults.length === 0 && warnings.length > 0) {
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
    toast.style = Toast.Style.Success;
    toast.title = `Exported ${pluralize(results.length, "icon")}`;
    toast.message = warnings.length > 0 ? `${outputDir}\n⚠ ${warnings.join("; ")}` : outputDir;
    toast.primaryAction = {
      title: "Reveal in Finder",
      onAction: () => showInFinder(outputDir),
    };
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = `Failed to export ${app.name}'s icons`;
    toast.message = String(error);
  }
}

type ViewMode = "list" | "grid";
const VIEW_MODE_KEY = "viewMode";

function AppActions({
  app,
  enabledSizes,
  formats,
  preferences,
  viewMode,
  setViewMode,
}: {
  app: Application;
  enabledSizes: readonly number[];
  formats: readonly ExportFormat[];
  preferences: ExtensionPreferences;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}) {
  const largestSize = enabledSizes[enabledSizes.length - 1];

  return (
    <ActionPanel>
      <ActionPanel.Section title="Export">
        <Action
          title="Export Icons"
          icon={Icon.Download}
          shortcut={{ modifiers: ["cmd"], key: "e" }}
          onAction={() => exportWithToast(app, enabledSizes, preferences.outputPath, formats)}
        />
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
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          onAction={async () => {
            const toast = await showToast({
              style: Toast.Style.Animated,
              title: `Copying ${largestSize} x ${largestSize} icon...`,
            });
            try {
              await copyIconToClipboard(app, largestSize);
              toast.style = Toast.Style.Success;
              toast.title = `Copied ${largestSize} x ${largestSize} icon`;
            } catch (error) {
              toast.style = Toast.Style.Failure;
              toast.title = `Failed to copy icon`;
              toast.message = String(error);
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
                  toast.style = Toast.Style.Failure;
                  toast.title = `Failed to copy ${size} x ${size} icon`;
                  toast.message = String(error);
                }
              }}
            />
          ))}
        </ActionPanel.Submenu>
        <Action.CopyToClipboard
          title="Copy App Path"
          icon={Icon.Clipboard}
          content={app.path}
          shortcut={{ modifiers: ["cmd"], key: "." }}
        />
        <Action.CopyToClipboard
          title="Copy App Name"
          icon={Icon.Clipboard}
          content={app.name}
          shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
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
        <Action.ShowInFinder path={app.path} shortcut={{ modifiers: ["cmd"], key: "return" }} />
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
              await showToast({
                style: Toast.Style.Failure,
                title: "Failed to show info in Finder",
                message: String(error),
              });
            }
          }}
        />
        <Action
          title="Show Export Folder in Finder"
          icon={Icon.Folder}
          shortcut={{ modifiers: ["cmd"], key: "f" }}
          onAction={async () => {
            const folderPath = path.join(normalizeOutputPath(preferences.outputPath), getAppFolderName(app));
            try {
              await stat(folderPath);
              await showInFinder(folderPath);
            } catch {
              await showToast({
                style: Toast.Style.Failure,
                title: "Export folder not found",
                message: `No icons have been exported for ${app.name} yet.`,
              });
            }
          }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

export default function Command() {
  const preferences = getPreferenceValues<ExtensionPreferences>();
  const enabledSizes = getEnabledSizes(preferences);
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

  const actionProps = { enabledSizes, formats, preferences, viewMode, setViewMode };

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
        {apps?.map((app) => (
          <Grid.Item
            key={app.path}
            content={{ fileIcon: app.path }}
            title={app.name}
            keywords={app.bundleId ? [app.bundleId] : []}
            actions={<AppActions app={app} {...actionProps} />}
          />
        ))}
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
