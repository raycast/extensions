import { pathToFileURL } from "url";

export const isWindows = process.platform === "win32";
export const isMac = process.platform === "darwin";

/** The modifier key Raycast uses as its primary shortcut modifier on this platform. */
export const primaryModifierLabel = isWindows ? "Ctrl" : "⌘";

/**
 * macOS stores a forward slash typed in Finder as a colon on disk, so Pocket and Card
 * names have to be translated back for display. Windows forbids colons in paths entirely,
 * so the translation must not happen there — a colon can only be a literal one.
 */
export function displayName(name: string): string {
  return isWindows ? name : name.replaceAll(":", "/");
}

/**
 * An `Image.Source` is a URL or an `assets/` file name, so a bare filesystem path is not
 * something Raycast is obliged to resolve. macOS happens to accept an absolute POSIX path,
 * but a Windows path never resolves — its backslashes and drive letter have to be turned
 * into a proper `file:///C:/…` URL, which also percent-encodes special characters.
 */
export function previewSource(path: string): string {
  return isWindows ? pathToFileURL(path).href : path;
}
