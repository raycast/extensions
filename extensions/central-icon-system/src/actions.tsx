import {
  Action,
  ActionPanel,
  Clipboard,
  Icon,
  type Image,
  Keyboard,
  Toast,
  closeMainWindow,
  environment,
  showHUD,
  showInFinder,
  showToast,
} from "@raycast/api";
import type { ReactElement } from "react";
import { axisIcon } from "./lib/ui-icons";
import { cornerIcon, showIcon, strokeIcon } from "./lib/axis-icons";
import { copyFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { BACKDROPS, type Backdrop, importFor, jsxFor } from "./lib/svg";
import { writeIconPng } from "./lib/png";
import { readSvg, type AxisOption } from "./lib/manifest";
import { addRecent, clearRecents, isPinned, togglePinned } from "./lib/storage";
import { markFailed, reportFailure } from "./lib/toast";
import {
  GRID_SIZES,
  GRID_SIZE_LABELS,
  PNG_SIZES,
  cornerKey,
  cornerLabel,
  type Corner,
  type IconTile,
  type PngSize,
  type ShowFilter,
  type Stroke,
} from "./types";

/**
 * Custom shortcuts, in platform-explicit form.
 *
 * The extension declares both macOS and Windows, so a bare `cmd`-only object is
 * silently broken on Windows. These four have no `Keyboard.Shortcut.Common`
 * member matching their semantics, so they stay custom — everything that does
 * match (Pin, Save, CopyName, RemoveAll, ToggleQuickLook) uses the constant.
 */
const SHORTCUTS = {
  pasteName: { macOS: { modifiers: ["shift", "cmd"], key: "v" }, Windows: { modifiers: ["shift", "ctrl"], key: "v" } },
  copyPng: { macOS: { modifiers: ["shift", "cmd"], key: "p" }, Windows: { modifiers: ["shift", "ctrl"], key: "p" } },
  pastePng: { macOS: { modifiers: ["opt", "cmd"], key: "p" }, Windows: { modifiers: ["alt", "ctrl"], key: "p" } },
  backdrop: { macOS: { modifiers: ["shift", "cmd"], key: "b" }, Windows: { modifiers: ["shift", "ctrl"], key: "b" } },
} satisfies Record<string, Keyboard.Shortcut>;

/**
 * Color used when rasterizing to PNG. Icons are `currentColor`, which a
 * rasterizer cannot resolve, so exports pick a concrete value: white on a dark
 * appearance, black on light — matching what the user sees in the grid.
 */
function exportColor(): string {
  return environment.appearance === "dark" ? "#FFFFFF" : "#000000";
}

/**
 * Run a PNG export, delivering the finished file however the caller wants.
 *
 * The animated toast fires **before** the async render — a long operation with
 * no indicator reads as a hang. `deliver` returns the success title, or `null`
 * to suppress the success toast entirely (used by paste, which closes the
 * window and shows a HUD instead).
 */
async function exportPng(
  tile: IconTile,
  size: PngSize,
  pendingTitle: string,
  deliver: (path: string) => Promise<string | null>,
): Promise<void> {
  const toast = await showToast({ style: Toast.Style.Animated, title: pendingTitle });
  try {
    const path = await writeIconPng(tile, size, exportColor());
    const successTitle = await deliver(path);
    if (successTitle === null) {
      await toast.hide();
      return;
    }
    toast.style = Toast.Style.Success;
    toast.title = successTitle;
  } catch (error) {
    markFailed(toast, `Failed to export ${tile.name}`, error);
  }
}

function copyPng(tile: IconTile, size: PngSize) {
  return exportPng(tile, size, `Copying ${tile.name} at ${size}px…`, async (path) => {
    await Clipboard.copy({ file: path });
    return `Copied ${tile.name} PNG (${size}px)`;
  });
}

function pastePng(tile: IconTile, size: PngSize) {
  return exportPng(tile, size, `Pasting ${tile.name} at ${size}px…`, async (path) => {
    // Close Raycast first so the frontmost app receives the paste, not Raycast.
    await closeMainWindow();
    await Clipboard.paste({ file: path });
    // The window is gone — a HUD, not a toast, confirms the paste.
    await showHUD(`Pasted ${tile.name} PNG (${size}px)`);
    return null;
  });
}

function savePng(tile: IconTile, size: PngSize) {
  return exportPng(tile, size, `Saving ${tile.name} at ${size}px…`, async (path) => {
    const destination = join(homedir(), "Downloads", `${tile.name}-${size}.png`);
    await copyFile(path, destination);
    await showInFinder(destination);
    return `Saved ${tile.name} to Downloads (${size}px)`;
  });
}

function PngSizeSubmenu(props: {
  title: string;
  icon: Image.ImageLike;
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

/** A submenu of mutually exclusive values, checkmarking the active one. */
function ChoiceSubmenu<T extends string | number>(props: {
  title: string;
  icon: Image.ImageLike;
  values: readonly T[];
  active: T;
  label?: (value: T) => string;
  itemIcon?: (value: T) => Image.ImageLike;
  onChange: (value: T) => void;
}) {
  return (
    <ActionPanel.Submenu title={props.title} icon={props.icon}>
      {props.values.map((value) => (
        <Action
          key={String(value)}
          title={`${props.label ? props.label(value) : String(value)}${value === props.active ? " ✓" : ""}`}
          icon={props.itemIcon ? props.itemIcon(value) : value === props.active ? Icon.Checkmark : Icon.Circle}
          onAction={() => props.onChange(value)}
        />
      ))}
    </ActionPanel.Submenu>
  );
}

/**
 * A style-axis submenu. Every value is offered; unbuilt ones are marked.
 *
 * Hiding uninstalled values (the earlier behaviour) made 28 of the 30 styles
 * permanently unreachable — you can't install a style you can't select.
 * Marking them keeps the set discoverable, and the ellipsis signals that
 * choosing one leads somewhere: the install screen, which carries the command.
 */
function AxisSubmenu<T>(props: {
  title: string;
  icon: Image.ImageLike;
  options: readonly AxisOption<T>[];
  active: T;
  label: (value: T) => string;
  itemIcon: (value: T) => Image.ImageLike;
  /** Identity for keys and the active check — values may be objects. */
  keyOf?: (value: T) => string;
  onChange: (value: T) => void;
}) {
  const identify = props.keyOf ?? ((value: T) => String(value));
  const activeKey = identify(props.active);
  return (
    <ActionPanel.Submenu title={props.title} icon={props.icon}>
      {props.options.map(({ value, built }) => (
        <Action
          key={identify(value)}
          // The site shows each value's own glyph — a stroke circle at that
          // weight, a bracket at that radius — so the icon slot carries real
          // information and can't be spent on state. Selection and
          // availability therefore live in the title.
          // Compare by key, not identity: corner values are objects, so `===`
          // would never match and the checkmark would never appear.
          title={
            `${props.label(value)}${identify(value) === activeKey ? " ✓" : ""}` + (built ? "" : " — Not Installed…")
          }
          icon={props.itemIcon(value)}
          onAction={() => props.onChange(value)}
        />
      ))}
    </ActionPanel.Submenu>
  );
}

export interface IconActionsProps {
  tile: IconTile;
  primaryAction: string;
  onUse: () => void;
  /** Every axis value, flagged with whether its data is built — see `axisOptions`. */
  axes: { corners: AxisOption<Corner>[]; strokes: AxisOption<Stroke>[] };
  columns: number;
  showName: boolean;
  setColumns: (value: number) => void;
  setShowName: (value: boolean) => void;
  corner: Corner;
  stroke: Stroke;
  show: ShowFilter;
  backdrop: Backdrop;
  setCorner: (value: Corner) => void;
  setStroke: (value: Stroke) => void;
  setShow: (value: ShowFilter) => void;
  setBackdrop: (value: Backdrop) => void;
  quickLook?: { path: string; name: string };
}

export function IconActions(props: IconActionsProps) {
  const { tile, onUse } = props;

  // Tiles carry metadata only; geometry is read on demand. This panel is built
  // for the selected tile alone, so one blob read per selection change — a
  // sub-millisecond seek, not a parse of the whole style.
  const svg = readSvg(tile.style, tile.name) ?? "";

  /** Record the use, then refresh so Recently Used reflects it immediately. */
  const use = () => {
    addRecent(tile.id);
    onUse();
  };

  // Every payload action is built unconditionally; `primaryAction` only
  // permutes the order. Shortcuts stay welded to their action, so muscle memory
  // survives a preference change (see docs/FINDINGS.md §3).
  const payloads: Record<string, ReactElement> = {
    pasteSvg: <Action.Paste key="pasteSvg" title="Paste SVG" content={svg} onPaste={use} />,
    copySvg: <Action.CopyToClipboard key="copySvg" title="Copy SVG" content={svg} onCopy={use} />,
    copyName: (
      <Action.CopyToClipboard
        key="copyName"
        title="Copy Name"
        content={tile.name}
        shortcut={Keyboard.Shortcut.Common.CopyName}
        onCopy={use}
      />
    ),
    pasteName: (
      <Action.Paste
        key="pasteName"
        title="Paste Name"
        content={tile.name}
        shortcut={SHORTCUTS.pasteName}
        onPaste={use}
      />
    ),
    copyJsx: <Action.CopyToClipboard key="copyJsx" title="Copy JSX" content={jsxFor(tile.name)} onCopy={use} />,
    copyImport: (
      <Action.CopyToClipboard
        key="copyImport"
        title="Copy Import Statement"
        content={importFor(tile.name, tile.style)}
        onCopy={use}
      />
    ),
  };

  const order = Object.keys(payloads).sort((a, b) => {
    if (a === props.primaryAction) return -1;
    if (b === props.primaryAction) return 1;
    return 0;
  });

  return (
    <ActionPanel title={tile.name}>
      <ActionPanel.Section>{order.map((key) => payloads[key])}</ActionPanel.Section>

      <ActionPanel.Section title="PNG">
        <PngSizeSubmenu
          title="Copy as PNG"
          icon={Icon.Image}
          shortcut={SHORTCUTS.copyPng}
          onSize={async (size) => {
            await copyPng(tile, size);
            use();
          }}
        />
        <PngSizeSubmenu
          title="Paste as PNG"
          icon={Icon.Image}
          shortcut={SHORTCUTS.pastePng}
          onSize={async (size) => {
            await pastePng(tile, size);
            use();
          }}
        />
        <PngSizeSubmenu
          title="Save as PNG"
          icon={Icon.Download}
          shortcut={Keyboard.Shortcut.Common.Save}
          onSize={async (size) => {
            await savePng(tile, size);
            use();
          }}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="Appearance">
        <ChoiceSubmenu
          title="Style"
          icon={axisIcon("style", props.tile.style)}
          values={["all", "outlined", "filled"] as const}
          active={props.show}
          label={(v) => (v === "all" ? "All" : v === "filled" ? "Solid" : "Line")}
          itemIcon={showIcon}
          onChange={props.setShow}
        />
        {/* Only axis values with built data — otherwise the user can persist a
            selection that has no icons behind it and reach a dead end. */}
        {/* One axis, five options — matching centralicons.com. Join and radius
            are not independent (square ships radius-0 only), so separate menus
            offered 8 combinations for 5 real styles and silently coerced the
            other 3. */}
        <AxisSubmenu
          title="Corner"
          icon={axisIcon("corner", props.tile.style)}
          options={props.axes.corners}
          active={props.corner}
          label={cornerLabel}
          itemIcon={cornerIcon}
          keyOf={cornerKey}
          onChange={props.setCorner}
        />
        <AxisSubmenu
          title="Stroke"
          icon={axisIcon("stroke", props.tile.style)}
          options={props.axes.strokes}
          active={props.stroke}
          label={(v) => `${v}px`}
          itemIcon={strokeIcon}
          onChange={props.setStroke}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="View">
        {/* Mirrors the Grid Size preference. Preferences only apply at launch,
            so anything worth changing mid-session needs a live control too. */}
        <ChoiceSubmenu
          title="Grid Size"
          icon={Icon.AppWindowGrid3x3}
          values={GRID_SIZES}
          active={props.columns}
          label={(v) => GRID_SIZE_LABELS[v]}
          onChange={props.setColumns}
        />
        <Action
          title={props.showName ? "Hide Names" : "Show Names"}
          icon={props.showName ? Icon.EyeDisabled : Icon.Eye}
          onAction={() => props.setShowName(!props.showName)}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="Preview">
        <ActionPanel.Submenu title="Set Preview Backdrop" icon={Icon.Brush} shortcut={SHORTCUTS.backdrop}>
          {(Object.keys(BACKDROPS) as Backdrop[]).map((key) => (
            <Action
              key={key}
              title={BACKDROPS[key].title}
              icon={key === props.backdrop ? Icon.Checkmark : Icon.Circle}
              onAction={() => props.setBackdrop(key)}
            />
          ))}
        </ActionPanel.Submenu>
        {props.quickLook && <Action.ToggleQuickLook shortcut={Keyboard.Shortcut.Common.ToggleQuickLook} />}
      </ActionPanel.Section>

      <ActionPanel.Section title="Central Icons">
        <Action.OpenInBrowser title="View Changelog" icon={Icon.Clock} url="https://centralicons.com/changelog" />
      </ActionPanel.Section>

      <ActionPanel.Section title="Storage">
        <Action
          title={isPinned(tile.id) ? `Unpin "${tile.name}"` : `Pin "${tile.name}"`}
          icon={isPinned(tile.id) ? Icon.PinDisabled : Icon.Geopin}
          shortcut={Keyboard.Shortcut.Common.Pin}
          onAction={() => {
            togglePinned(tile.id);
            onUse();
          }}
        />
        <Action
          title="Clear Recently Used"
          icon={Icon.XMarkCircle}
          style={Action.Style.Destructive}
          shortcut={Keyboard.Shortcut.Common.RemoveAll}
          onAction={async () => {
            try {
              clearRecents();
              onUse();
              await showToast({ style: Toast.Style.Success, title: "Cleared recently used" });
            } catch (error) {
              await reportFailure("Couldn't clear recents", error);
            }
          }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
