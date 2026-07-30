import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  confirmAlert,
  getPreferenceValues,
  Grid,
  Icon,
  open,
  openCommandPreferences,
  showInFinder,
  showToast,
  Toast,
  Keyboard,
} from "@raycast/api";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { memo } from "react";
import {
  buildSvg,
  getVariantIcons,
  iconDataUriFor,
  maskWrap,
  reactSnippet,
  solidSnippet,
  variantKeyOf,
  vueSnippet,
  type MaskMode,
  type VariantParts,
} from "./icons";
import type { Pack } from "./pack";
import type { ExportGate } from "./gate";

type PrimaryAction = "copy-svg" | "paste-svg" | "copy-name" | "copy-react";

const WEBSITE_URL = "https://centralicons.com";
const BUY_LICENSE_URL = "https://iconists.lemonsqueezy.com/checkout/buy/05dceada-ddef-4e99-b8aa-0130f2b60662";

export const GRID_SIZE_OPTIONS = [
  { title: "Tiny", columns: 8, inset: Grid.Inset.Large },
  { title: "Small", columns: 8, inset: Grid.Inset.Medium },
  { title: "Medium", columns: 6, inset: Grid.Inset.Small },
  { title: "Large", columns: 5, inset: Grid.Inset.Small },
] as const;

function exportPath(fileName: string): string {
  const downloads = join(homedir(), "Downloads");
  const dot = fileName.lastIndexOf(".");
  const base = fileName.slice(0, dot);
  const ext = fileName.slice(dot);
  let candidate = join(downloads, fileName);
  for (let i = 1; existsSync(candidate); i++) candidate = join(downloads, `${base}-${i}${ext}`);
  return candidate;
}

interface IconGridItemProps {
  name: string;
  pack: Pack;
  iconCount: number;
  variant: VariantParts;
  maskMode: MaskMode;
  categories: string[];
  category: string;
  onCategoryChange: (category: string) => void;
  gate: ExportGate;
  onCheckUpdates: () => void;
  /** The full action panel (~60 elements) is only rendered for the selected
   *  item — building it for all 2000+ icons exceeds the worker's memory. */
  selected: boolean;
}

export const IconGridItem = memo(function IconGridItem({
  name,
  pack,
  iconCount,
  variant,
  maskMode,
  categories,
  category,
  onCategoryChange,
  gate,
  onCheckUpdates,
  selected,
}: IconGridItemProps) {
  const preferences = getPreferenceValues<{ primaryAction: PrimaryAction }>();
  const effectiveVariant = variant.join === "square" ? { ...variant, radius: "0" } : variant;
  const variantKey = variantKeyOf(effectiveVariant);
  const inner = getVariantIcons(pack, variantKey)[name] ?? "";
  const svg = buildSvg(maskWrap(inner, `${variantKey}-${name}`, maskMode), "black");
  const { licenseState, remainingCopies, resolveLicenseState, runExport } = gate;

  async function exportSvgFile() {
    await runExport(async () => {
      const path = exportPath(`${name}.svg`);
      writeFileSync(path, svg, "utf8");
      await showToast({
        style: Toast.Style.Success,
        title: `Exported ${name}.svg`,
        message: "Saved to Downloads",
        primaryAction: {
          title: "Show in Finder",
          onAction: () => showInFinder(path),
        },
      });
    });
  }

  async function exportAllIcons() {
    // Waits for a validation still in flight, so a licensed user who runs this
    // immediately after opening the command is not told they need a licence.
    if ((await resolveLicenseState()) !== "valid") {
      await confirmAlert({
        title: "License Required",
        message:
          "Exporting all icons requires a valid license. Enter your license key in the extension preferences, " +
          "then reopen this command — a new key only takes effect the next time the command launches.",
        icon: Icon.Key,
        primaryAction: {
          title: "Open Preferences",
          onAction: openCommandPreferences,
        },
      });
      return;
    }
    const dir = join(homedir(), "Downloads", `central-icons-${variantKey}`);
    if (
      await confirmAlert({
        title: "Export All Icons",
        message: `Save ${iconCount} SVG files (${variantKey}) to Downloads?`,
        primaryAction: { title: "Export" },
      })
    ) {
      const variantIcons = getVariantIcons(pack, variantKey);
      mkdirSync(dir, { recursive: true });
      for (const iconName of Object.keys(variantIcons))
        writeFileSync(
          join(dir, `${iconName}.svg`),
          buildSvg(maskWrap(variantIcons[iconName], `${variantKey}-${iconName}`, maskMode), "black"),
          "utf8",
        );
      await showToast({
        style: Toast.Style.Success,
        title: `Exported ${iconCount} icons`,
        message: dir,
        primaryAction: {
          title: "Show in Finder",
          onAction: () => showInFinder(dir),
        },
      });
    }
  }

  function primaryActionFor() {
    switch (preferences.primaryAction) {
      case "copy-svg":
        return <Action title="Copy SVG" icon={Icon.Clipboard} onAction={() => runExport(() => Clipboard.copy(svg))} />;
      case "paste-svg":
        return (
          <Action title="Paste SVG" icon={Icon.Clipboard} onAction={() => runExport(() => Clipboard.paste(svg))} />
        );
      case "copy-name":
        return (
          <Action title="Copy Name" icon={Icon.Clipboard} onAction={() => runExport(() => Clipboard.copy(name))} />
        );
      case "copy-react":
        return (
          <Action
            title="Copy React Snippet"
            icon={Icon.Clipboard}
            onAction={() => runExport(() => Clipboard.copy(reactSnippet(name, variantKey)))}
          />
        );
    }
  }

  const licenseTitle =
    licenseState === "valid"
      ? "License Active — Manage…"
      : licenseState === "invalid"
        ? "Invalid License Key — Manage…"
        : `Enter License Key… (${remainingCopies} Free Copies Remaining)`;

  return (
    <Grid.Item
      key={name}
      id={name}
      content={{ source: iconDataUriFor(variantKey, name, inner) }}
      title={name.replace(/^Icon/, "")}
      actions={
        selected ? (
          <ActionPanel>
            <ActionPanel.Section>
              {primaryActionFor()}
              {preferences.primaryAction !== "copy-svg" && (
                <Action
                  title="Copy SVG"
                  icon={Icon.Clipboard}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                  onAction={() => runExport(() => Clipboard.copy(svg))}
                />
              )}
              {preferences.primaryAction !== "paste-svg" && (
                <Action
                  title="Paste SVG"
                  icon={Icon.Clipboard}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
                  onAction={() => runExport(() => Clipboard.paste(svg))}
                />
              )}
              {preferences.primaryAction !== "copy-name" && (
                <Action
                  title="Copy Name"
                  icon={Icon.Clipboard}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
                  onAction={() => runExport(() => Clipboard.copy(name))}
                />
              )}
              {preferences.primaryAction !== "copy-react" && (
                <Action
                  title="Copy React Snippet"
                  icon={Icon.Clipboard}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                  onAction={() => runExport(() => Clipboard.copy(reactSnippet(name, variantKey)))}
                />
              )}
              <Action
                title="Copy React Native Snippet"
                icon={Icon.Clipboard}
                onAction={() => runExport(() => Clipboard.copy(reactSnippet(name, variantKey, true)))}
              />
              <Action
                title="Copy Vue Snippet"
                icon={Icon.Clipboard}
                onAction={() => runExport(() => Clipboard.copy(vueSnippet(svg)))}
              />
              <Action
                title="Copy Solid Snippet"
                icon={Icon.Clipboard}
                onAction={() => runExport(() => Clipboard.copy(solidSnippet(name, svg)))}
              />
              <Action
                title="Copy Data Uri"
                icon={Icon.Clipboard}
                shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                onAction={() => runExport(() => Clipboard.copy(iconDataUriFor(variantKey, name, inner)))}
              />
            </ActionPanel.Section>
            <ActionPanel.Section title="Export">
              <Action
                title="Export SVG File…"
                icon={Icon.ArrowDownCircle}
                shortcut={Keyboard.Shortcut.Common.Edit}
                onAction={exportSvgFile}
              />
              <Action
                title="Export All Icons…"
                icon={Icon.Download}
                shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                onAction={exportAllIcons}
              />
              <Action
                title="Open Centralicons.com"
                icon={Icon.Globe}
                shortcut={Keyboard.Shortcut.Common.OpenWith}
                onAction={() => open(WEBSITE_URL)}
              />
            </ActionPanel.Section>
            <ActionPanel.Submenu
              title="Category"
              icon={Icon.AppWindowGrid3x3}
              shortcut={{ modifiers: ["cmd", "shift"], key: "g" }}
            >
              {["All", "New", ...categories].map((c) => (
                <Action
                  key={c}
                  title={c}
                  icon={c === category ? { source: Icon.Checkmark, tintColor: Color.Blue } : Icon.Circle}
                  onAction={() => onCategoryChange(c)}
                />
              ))}
            </ActionPanel.Submenu>
            <ActionPanel.Section>
              <Action title="Check for Icon Updates" icon={Icon.ArrowClockwise} onAction={onCheckUpdates} />
            </ActionPanel.Section>
            <ActionPanel.Section title="License">
              <Action
                title={licenseTitle}
                icon={Icon.Key}
                shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
                onAction={openCommandPreferences}
              />
              <Action title="Buy a License" icon={Icon.Cart} onAction={() => open(BUY_LICENSE_URL)} />
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action.CopyToClipboard
                title="Copy Current Variant"
                content={variantKey}
                shortcut={Keyboard.Shortcut.Common.CopyName}
              />
            </ActionPanel.Section>
          </ActionPanel>
        ) : undefined
      }
    />
  );
});
