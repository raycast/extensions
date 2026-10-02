import { basename } from "path";
import { Action, ActionPanel, Clipboard, Icon, Keyboard, showInFinder, showToast, Toast } from "@raycast/api";
import { svgFilename, writeToDownloads } from "../utils/exportUtils";
import { fetchSvgFile } from "../utils/svgFetch";
import { canCopySvgAsPng, copySvgAsPng } from "../utils/svgRaster";
import { Backdrop, BACKDROPS, displaySafe, SvgAsset } from "../utils/svgUtils";
import { failToast } from "../utils/toastUtils";

interface SvgActionsProps {
  asset: SvgAsset;
  /** The page the SVG was found on — the reference the network guard judges its URL against. */
  pageUrl: string;
  backdrop: Backdrop;
  setBackdrop: (value: Backdrop) => void;
  /** True once this tile's Quick Look file is on disk. */
  canQuickLook: boolean;
}

/** ⌘⇧P / ctrl⇧P — no `Keyboard.Shortcut.Common` member means "copy as image". */
const COPY_PNG_SHORTCUT: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd", "shift"], key: "p" },
  Windows: { modifiers: ["ctrl", "shift"], key: "p" },
};

/** ⇧⌘B / ⇧ctrl B, as in Central Icons. */
const BACKDROP_SHORTCUT: Keyboard.Shortcut = {
  macOS: { modifiers: ["shift", "cmd"], key: "b" },
  Windows: { modifiers: ["shift", "ctrl"], key: "b" },
};

/**
 * Copy as SVG, Copy as PNG, and Export as SVG for one SVG.
 *
 * An SVG found as markup (inline, a sprite symbol, a data URI) is already in
 * hand. One found as a URL is downloaded only when an action asks for it —
 * through the network guard, because the page chose that URL.
 */
export function SvgActions({ asset, pageUrl, backdrop, setBackdrop, canQuickLook }: SvgActionsProps) {
  const markup = asset.markup;

  const withMarkup = async (toast: Toast): Promise<string> => {
    if (markup !== undefined) return markup;
    toast.title = "Downloading SVG…";
    return (await fetchSvgFile(asset.url!, pageUrl)).markup;
  };

  const copyRemoteSvg = async () => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Downloading SVG…", message: asset.name });
    try {
      const text = await withMarkup(toast);
      await Clipboard.copy(text);
      toast.style = Toast.Style.Success;
      toast.title = "Copied SVG";
    } catch (error) {
      failToast(toast, "Could not copy SVG", error);
    }
  };

  const copyPng = async () => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Rendering PNG…", message: asset.name });
    try {
      const text = await withMarkup(toast);
      toast.title = "Rendering PNG…";
      // Rendered by AppKit, so a display copy: nothing the SVG references off-file is fetched.
      const { width, height } = await copySvgAsPng(displaySafe(text));
      toast.style = Toast.Style.Success;
      toast.title = "Copied PNG";
      toast.message = `${width} × ${height}`;
    } catch (error) {
      failToast(toast, "Could not copy PNG", error);
    }
  };

  const exportSvg = async () => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Saving SVG…", message: asset.name });
    try {
      const text = await withMarkup(toast);
      toast.title = "Saving SVG…";
      const path = await writeToDownloads(svgFilename(asset.name), text);
      toast.style = Toast.Style.Success;
      // The path actually written: after a collision it is `name 2.svg`, not `name.svg`.
      toast.title = `Saved ${basename(path)}`;
      toast.message = "in Downloads";
      toast.primaryAction = {
        // A toast action cannot use <Action.ShowInFinder>, which would supply the
        // per-platform title for free. Same wording as ResourceExportActions.
        title: process.platform === "darwin" ? "Show in Finder" : "File Explorer",
        shortcut: { macOS: { modifiers: ["cmd"], key: "o" }, Windows: { modifiers: ["ctrl"], key: "o" } },
        onAction: () => showInFinder(path),
      };
      toast.secondaryAction = {
        title: "Copy Path",
        shortcut: { macOS: { modifiers: ["cmd"], key: "c" }, Windows: { modifiers: ["ctrl"], key: "c" } },
        onAction: async (t) => {
          await Clipboard.copy(path);
          t.message = "Path copied to clipboard";
        },
      };
    } catch (error) {
      failToast(toast, "Could not save SVG", error);
    }
  };

  return (
    <ActionPanel>
      <ActionPanel.Section title="SVG">
        {markup !== undefined ? (
          <Action.CopyToClipboard title="Copy as SVG" content={markup} shortcut={Keyboard.Shortcut.Common.Copy} />
        ) : (
          <Action
            title="Copy as SVG"
            icon={Icon.Clipboard}
            shortcut={Keyboard.Shortcut.Common.Copy}
            onAction={copyRemoteSvg}
          />
        )}
        {canCopySvgAsPng && (
          <Action title="Copy as PNG" icon={Icon.Image} shortcut={COPY_PNG_SHORTCUT} onAction={copyPng} />
        )}
        <Action
          title="Export as SVG"
          icon={Icon.Download}
          shortcut={Keyboard.Shortcut.Common.Save}
          onAction={exportSvg}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Preview">
        <ActionPanel.Submenu title="Set Preview Backdrop" icon={Icon.Brush} shortcut={BACKDROP_SHORTCUT}>
          {(Object.keys(BACKDROPS) as Backdrop[]).map((key) => (
            <Action
              key={key}
              title={BACKDROPS[key].title}
              icon={key === backdrop ? Icon.Checkmark : Icon.Circle}
              onAction={() => setBackdrop(key)}
            />
          ))}
        </ActionPanel.Submenu>
        {canQuickLook && <Action.ToggleQuickLook shortcut={Keyboard.Shortcut.Common.ToggleQuickLook} />}
      </ActionPanel.Section>
      {asset.url && (
        <ActionPanel.Section title="File">
          <Action.OpenInBrowser url={asset.url} shortcut={Keyboard.Shortcut.Common.Open} />
          <Action.CopyToClipboard title="Copy URL" content={asset.url} />
        </ActionPanel.Section>
      )}
    </ActionPanel>
  );
}
