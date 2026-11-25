import { Action, ActionPanel, Clipboard, Icon, Keyboard, showHUD, showToast, Toast } from "@raycast/api";
import type { ReactElement } from "react";
import { githubUrl, licenseUrl, OpenSymbol, sameIconElsewhere, variantsOf, websiteUrl } from "../lib/data";
import {
  ALL_FORMATS,
  ALL_SIZES,
  copyImageWithToast,
  copySvgCodeWithToast,
  exportWithToast,
  FORMAT_TITLES,
} from "../lib/export";
import { attribution } from "../lib/formats";
import { clipboardFolder, exportTemplate, Weight, WEIGHT_TITLES, WEIGHTS } from "../lib/render";
import { GridSize, PrimaryAction, prefs, SymbolState } from "../lib/state";
import { SymbolDetail } from "./symbol-detail";
import { SymbolGrid } from "./symbol-grid";
import { UpdateView } from "./update-view";

const swiftUI = (s: OpenSymbol) => `Image("${s.xcodeName}")`;
const swiftUILabel = (s: OpenSymbol) => {
  const title = s.baseName.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return `Label("${title}", image: "${s.xcodeName}")`;
};
/** Swift spells it `.ultraLight`. */
const swiftWeight = (w: Weight) => (w === "ultralight" ? "ultraLight" : w);
const uiKit = (s: OpenSymbol, weight: Weight) =>
  `let configuration = UIImage.SymbolConfiguration(pointSize: 24, weight: .${swiftWeight(weight)}, scale: .medium)\nlet image = UIImage(named: "${s.xcodeName}", in: nil, with: configuration)`;
const appKit = (s: OpenSymbol, weight: Weight) =>
  `let configuration = NSImage.SymbolConfiguration(pointSize: 24, weight: .${swiftWeight(weight)}, scale: .medium)\nlet image = NSImage(named: "${s.xcodeName}")?\n    .withSymbolConfiguration(configuration)`;

async function copyTemplateFile(s: OpenSymbol) {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Downloading template…" });
  try {
    const file = await exportTemplate(s, clipboardFolder());
    await Clipboard.copy({ file });
    await toast.hide();
    await showHUD(`Copied ${s.xcodeName}.svg`);
  } catch (e) {
    toast.style = Toast.Style.Failure;
    toast.title = "Couldn't copy the template";
    toast.message = e instanceof Error ? e.message : String(e);
  }
}

export function SymbolActions({
  symbol,
  state,
  isDetail = false,
}: {
  symbol: OpenSymbol;
  state: SymbolState;
  isDetail?: boolean;
}) {
  const recent = () => state.addRecent(symbol);
  const primary: PrimaryAction = prefs().primaryAction ?? "copy-image";
  const run = (fn: () => unknown) => () => {
    recent();
    fn();
  };

  const main: Record<PrimaryAction, ReactElement> = {
    "copy-name": (
      <Action.CopyToClipboard key="copy-name" title="Copy Xcode Name" content={symbol.xcodeName} onCopy={recent} />
    ),
    "paste-name": (
      <Action.Paste key="paste-name" title="Paste Xcode Name" content={symbol.xcodeName} onPaste={recent} />
    ),
    "copy-swiftui": (
      <Action.CopyToClipboard
        key="copy-swiftui"
        title="Copy SwiftUI Image"
        icon={Icon.Code}
        content={swiftUI(symbol)}
        onCopy={recent}
      />
    ),
    "copy-image": (
      <Action
        key="copy-image"
        title="Copy Image"
        icon={Icon.Image}
        shortcut={primary === "copy-image" ? undefined : { modifiers: ["cmd", "shift"], key: "i" }}
        onAction={run(() => copyImageWithToast(symbol))}
      />
    ),
    "copy-svg": (
      <Action
        key="copy-svg"
        title="Copy SVG Code"
        icon={Icon.CodeBlock}
        shortcut={primary === "copy-svg" ? undefined : { modifiers: ["cmd", "shift"], key: "s" }}
        onAction={run(() => copySvgCodeWithToast(symbol))}
      />
    ),
    "copy-file": (
      <Action
        key="copy-file"
        title="Copy Symbol Template File"
        icon={Icon.Document}
        shortcut={primary === "copy-file" ? undefined : { modifiers: ["cmd", "shift"], key: "c" }}
        onAction={run(() => copyTemplateFile(symbol))}
      />
    ),
  };
  // The primary action goes first; Copy Image and Copy SVG Code otherwise live in their own sections.
  const copyFamily: PrimaryAction[] = ["copy-name", "paste-name", "copy-swiftui", "copy-file"];
  const order = [primary, ...copyFamily.filter((k) => k !== primary)];

  const sameIcon = sameIconElsewhere(symbol);
  const variants = variantsOf(symbol);

  return (
    <ActionPanel title={symbol.xcodeName}>
      <ActionPanel.Section>
        {order.map((k) => main[k])}
        <Action.CopyToClipboard
          title="Copy Name"
          content={symbol.name}
          shortcut={Keyboard.Shortcut.Common.CopyName}
          onCopy={recent}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="Symbol">
        {!isDetail && (
          <Action.Push
            title="Show Info"
            icon={Icon.Info}
            shortcut={{ modifiers: ["cmd"], key: "i" }}
            target={<SymbolDetail symbol={symbol} />}
          />
        )}
        {sameIcon.length > 1 && (
          <Action.Push
            title="Show in Every Library"
            icon={Icon.AppWindowGrid3x3}
            shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
            target={<SymbolGrid title={`"${symbol.baseName}" in every library`} symbols={sameIcon} showLibrary />}
          />
        )}
        {variants.length > 1 && (
          <Action.Push
            title="Show Outline and Fill"
            icon={Icon.CircleFilled}
            shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
            target={<SymbolGrid title={`${symbol.library.name}: ${symbol.baseName}`} symbols={variants} />}
          />
        )}
        <Action
          title={state.isPinned(symbol) ? "Unpin Symbol" : "Pin Symbol"}
          icon={state.isPinned(symbol) ? Icon.PinDisabled : Icon.Pin}
          shortcut={Keyboard.Shortcut.Common.Pin}
          onAction={() => state.togglePin(symbol)}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="Export">
        <Action
          title="Export Symbol"
          icon={Icon.Download}
          // ⌘E matches Common.Edit's chord, but exporting isn't editing; this
          // mirrors SF Symbols Search, which uses ⌘E for the same action.
          // eslint-disable-next-line @raycast/prefer-common-shortcut
          shortcut={{ modifiers: ["cmd"], key: "e" }}
          onAction={run(() => exportWithToast([symbol]))}
        />
        <ActionPanel.Submenu title="Export Symbol Size…" icon={Icon.Download}>
          {ALL_SIZES.map((size) => (
            <Action key={size} title={`${size} × ${size}`} onAction={run(() => exportWithToast([symbol], { size }))} />
          ))}
        </ActionPanel.Submenu>
        <ActionPanel.Submenu title="Export Symbol Weight…" icon={Icon.Download}>
          {WEIGHTS.map((weight) => (
            <Action
              key={weight}
              title={WEIGHT_TITLES[weight]}
              onAction={run(() => exportWithToast([symbol], { weight }))}
            />
          ))}
        </ActionPanel.Submenu>
        <ActionPanel.Submenu title="Export Symbol as…" icon={Icon.Download}>
          {ALL_FORMATS.map((format) => (
            <Action
              key={format}
              title={FORMAT_TITLES[format]}
              onAction={run(() => exportWithToast([symbol], { formats: [format] }))}
            />
          ))}
        </ActionPanel.Submenu>
        {variants.length > 1 && (
          <Action
            title="Export Outline and Fill"
            icon={Icon.Download}
            shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
            onAction={run(() => exportWithToast(variants))}
          />
        )}
      </ActionPanel.Section>

      <ActionPanel.Section title="Copy Image">
        {primary !== "copy-image" && main["copy-image"]}
        <ActionPanel.Submenu title="Copy Image Size…" icon={Icon.Image}>
          {ALL_SIZES.map((size) => (
            <Action key={size} title={`${size} × ${size}`} onAction={run(() => copyImageWithToast(symbol, { size }))} />
          ))}
        </ActionPanel.Submenu>
      </ActionPanel.Section>

      <ActionPanel.Section title="Code">
        {primary !== "copy-svg" && main["copy-svg"]}
        <Action.CopyToClipboard
          title="Copy SwiftUI Label"
          icon={Icon.Code}
          content={swiftUILabel(symbol)}
          onCopy={recent}
        />
        <Action.CopyToClipboard
          title="Copy UIKit Snippet"
          icon={Icon.Code}
          content={uiKit(symbol, state.weight)}
          onCopy={recent}
        />
        <Action.CopyToClipboard
          title="Copy AppKit Snippet"
          icon={Icon.Code}
          content={appKit(symbol, state.weight)}
          onCopy={recent}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="View">
        <ActionPanel.Submenu title="Weight…" icon={Icon.Text} shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}>
          {WEIGHTS.map((w) => (
            <Action
              key={w}
              title={WEIGHT_TITLES[w]}
              icon={w === state.weight ? Icon.Checkmark : undefined}
              onAction={() => state.setWeight(w)}
            />
          ))}
        </ActionPanel.Submenu>
        {!isDetail && (
          <ActionPanel.Submenu title="Grid Size…" icon={Icon.AppWindowGrid2x2}>
            {(["small", "medium", "large"] as GridSize[]).map((g) => (
              <Action
                key={g}
                title={g[0].toUpperCase() + g.slice(1)}
                icon={g === state.gridSize ? Icon.Checkmark : undefined}
                onAction={() => state.setGridSize(g)}
              />
            ))}
          </ActionPanel.Submenu>
        )}
        {state.recent.length > 0 && (
          <Action
            title="Clear Recently Used Symbols"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
            onAction={state.clearRecents}
          />
        )}
        <Action.Push title="Check for Symbol Updates" icon={Icon.ArrowClockwise} target={<UpdateView embedded />} />
      </ActionPanel.Section>

      <ActionPanel.Section title="Links">
        <Action.OpenInBrowser
          title="Open on Open Symbols"
          url={websiteUrl(symbol)}
          shortcut={Keyboard.Shortcut.Common.Open}
        />
        <Action.CopyToClipboard
          title="Copy Attribution"
          icon={Icon.QuotationMarks}
          content={attribution(symbol)}
          shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
        />
        <Action.OpenInBrowser title="View Template on GitHub" url={githubUrl(symbol)} />
        <Action.OpenInBrowser title={`View ${symbol.library.name} License`} url={licenseUrl(symbol.library)} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
