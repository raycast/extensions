import {
  Action,
  ActionPanel,
  Clipboard,
  Icon,
  Keyboard,
  Toast,
  closeMainWindow,
  environment,
  open,
  showHUD,
  showInFinder,
  showToast,
} from "@raycast/api";
import { homedir } from "node:os";
import { join } from "node:path";
import { copyFile } from "node:fs/promises";
import type { Cursor, PngSize } from "./interface";
import { PNG_SIZES } from "./interface";
import { writeCursorPng } from "./lib/png";
import { BACKDROPS, type Backdrop } from "./lib/svg";
import { copyErrorAction, reportFailure } from "./lib/toast";

/**
 * Render a cursor to a PNG on disk, then hand the file path to `deliver`.
 * Fires an animated toast *before* the async render so the panel never looks
 * stalled, and surfaces any failure with a Copy-Error action. `deliver`
 * returns the success-toast title (or `null` to suppress it, e.g. when the
 * main window has been closed for a paste).
 */
async function exportPng(
  cursor: Cursor,
  size: PngSize,
  pendingTitle: string,
  deliver: (path: string) => Promise<string | null>,
): Promise<void> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: pendingTitle,
  });
  try {
    const path = await writeCursorPng(cursor.id, cursor.svg, size);
    const successTitle = await deliver(path);
    if (successTitle === null) {
      await toast.hide();
      return;
    }
    toast.style = Toast.Style.Success;
    toast.title = successTitle;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = `Failed to export ${cursor.name}`;
    toast.message = error instanceof Error ? error.message : "Unknown error";
    toast.primaryAction = copyErrorAction(toast.message);
  }
}

function copyPng(cursor: Cursor, size: PngSize) {
  return exportPng(cursor, size, `Copying ${cursor.name} at ${size}px…`, async (path) => {
    await Clipboard.copy({ file: path });
    return `Copied ${cursor.name} PNG (${size}px)`;
  });
}

function pastePng(cursor: Cursor, size: PngSize) {
  return exportPng(cursor, size, `Pasting ${cursor.name} at ${size}px…`, async (path) => {
    // Close Raycast first so the frontmost app receives the paste, not Raycast.
    await closeMainWindow();
    await Clipboard.paste({ file: path });
    // Window is gone — a HUD, not a toast, confirms the paste.
    await showHUD(`Pasted ${cursor.name} PNG (${size}px)`);
    return null;
  });
}

function savePng(cursor: Cursor, size: PngSize) {
  return exportPng(cursor, size, `Saving ${cursor.name} at ${size}px…`, async (path) => {
    const destination = join(homedir(), "Downloads", `${cursor.id}-${size}.png`);
    await copyFile(path, destination);
    await showInFinder(destination);
    return `Saved ${cursor.name} to Downloads (${size}px)`;
  });
}

/** A size-picking submenu that runs `onSize` for the chosen PNG size. */
function PngSizeSubmenu(props: {
  title: string;
  icon: Icon;
  shortcut?: Keyboard.Shortcut;
  onSize: (size: PngSize) => Promise<void>;
}) {
  return (
    <ActionPanel.Submenu title={props.title} icon={props.icon} shortcut={props.shortcut}>
      {PNG_SIZES.map((size) => (
        <Action key={size} title={`${size} × ${size}`} icon={Icon.Image} onAction={() => props.onSize(size)} />
      ))}
    </ActionPanel.Submenu>
  );
}

export function CursorActions(props: {
  cursor: Cursor;
  primaryAction: Preferences["primaryAction"];
  backdrop: Backdrop;
  setBackdrop: (backdrop: Backdrop) => Promise<void>;
}) {
  const { cursor, primaryAction, backdrop, setBackdrop } = props;

  const copySvg = <Action.CopyToClipboard title="Copy Cursor SVG" content={cursor.svg} icon={Icon.Clipboard} />;
  const pasteSvg = <Action.Paste title="Paste Cursor SVG" content={cursor.svg} icon={Icon.Text} />;

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {primaryAction === "copy" ? (
          <>
            {copySvg}
            {pasteSvg}
          </>
        ) : (
          <>
            {pasteSvg}
            {copySvg}
          </>
        )}
        <Action.ToggleQuickLook shortcut={Keyboard.Shortcut.Common.ToggleQuickLook} />
      </ActionPanel.Section>

      <ActionPanel.Section title="PNG">
        <PngSizeSubmenu
          title="Copy as PNG"
          icon={Icon.Image}
          shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
          onSize={(size) => copyPng(cursor, size)}
        />
        <PngSizeSubmenu
          title="Paste as PNG"
          icon={Icon.Image}
          shortcut={{ modifiers: ["cmd", "opt"], key: "p" }}
          onSize={(size) => pastePng(cursor, size)}
        />
        <PngSizeSubmenu
          title="Save as PNG"
          icon={Icon.Download}
          shortcut={Keyboard.Shortcut.Common.Save}
          onSize={(size) => savePng(cursor, size)}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action.CopyToClipboard
          title="Copy Cursor Name"
          content={cursor.name}
          icon={Icon.Text}
          shortcut={Keyboard.Shortcut.Common.CopyName}
        />
        <ActionPanel.Submenu
          title="Set Preview Backdrop"
          icon={Icon.Brush}
          shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
        >
          {(Object.keys(BACKDROPS) as Backdrop[]).map((key) => (
            <Action
              key={key}
              title={BACKDROPS[key].title}
              icon={key === backdrop ? Icon.Checkmark : Icon.Circle}
              onAction={() => setBackdrop(key)}
            />
          ))}
        </ActionPanel.Submenu>
        <Action
          title="Open Support Folder"
          icon={Icon.Folder}
          onAction={async () => {
            try {
              await open(environment.supportPath);
            } catch (error) {
              await reportFailure("Failed to open support folder", error);
            }
          }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
