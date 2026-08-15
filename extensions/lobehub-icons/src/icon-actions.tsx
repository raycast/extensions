import { Action, ActionPanel, Clipboard, Icon, Toast, showToast } from "@raycast/api";
import {
  getAssetUrl,
  getPrimaryAssetType,
  isAssetVariantAvailable,
  type AssetVariant,
  type AssetVariantGroup,
  type PreparedIconEntry,
} from "./icon-utils";

const svgVariants: AssetVariant[] = [
  {
    key: "svg-mono",
    title: "Copy Mono SVG URL",
    group: "mono",
    type: "mono",
    format: "svg",
  },
  {
    key: "svg-color",
    title: "Copy Color SVG URL",
    group: "color",
    type: "color",
    format: "svg",
  },
  {
    key: "svg-text",
    title: "Copy Text SVG URL",
    group: "text",
    type: "text",
    format: "svg",
  },
  {
    key: "svg-text-cn",
    title: "Copy Chinese Text SVG URL",
    group: "text-cn",
    type: "text-cn",
    format: "svg",
  },
  {
    key: "svg-text-color",
    title: "Copy Text Color SVG URL",
    group: "text-color",
    type: "text-color",
    format: "svg",
  },
  {
    key: "svg-brand",
    title: "Copy Brand SVG URL",
    group: "brand",
    type: "brand",
    format: "svg",
  },
  {
    key: "svg-brand-color",
    title: "Copy Brand Color SVG URL",
    group: "brand-color",
    type: "brand-color",
    format: "svg",
  },
];

const pngVariants: AssetVariant[] = [
  {
    key: "png-mono-light",
    title: "Copy Mono Light PNG URL",
    group: "mono",
    theme: "light",
    format: "png",
    isDarkMode: false,
  },
  {
    key: "png-mono-dark",
    title: "Copy Mono Dark PNG URL",
    group: "mono",
    theme: "dark",
    format: "png",
    isDarkMode: true,
  },
  {
    key: "png-color-light",
    title: "Copy Color Light PNG URL",
    group: "color",
    theme: "light",
    type: "color",
    format: "png",
    isDarkMode: false,
  },
  {
    key: "png-color-dark",
    title: "Copy Color Dark PNG URL",
    group: "color",
    theme: "dark",
    type: "color",
    format: "png",
    isDarkMode: true,
  },
  {
    key: "png-text-light",
    title: "Copy Text Light PNG URL",
    group: "text",
    theme: "light",
    type: "text",
    format: "png",
    isDarkMode: false,
  },
  {
    key: "png-text-dark",
    title: "Copy Text Dark PNG URL",
    group: "text",
    theme: "dark",
    type: "text",
    format: "png",
    isDarkMode: true,
  },
  {
    key: "png-text-cn-light",
    title: "Copy Chinese Text Light PNG URL",
    group: "text-cn",
    theme: "light",
    type: "text-cn",
    format: "png",
    isDarkMode: false,
  },
  {
    key: "png-text-cn-dark",
    title: "Copy Chinese Text Dark PNG URL",
    group: "text-cn",
    theme: "dark",
    type: "text-cn",
    format: "png",
    isDarkMode: true,
  },
  {
    key: "png-text-color-light",
    title: "Copy Text Color Light PNG URL",
    group: "text-color",
    theme: "light",
    type: "text-color",
    format: "png",
    isDarkMode: false,
  },
  {
    key: "png-text-color-dark",
    title: "Copy Text Color Dark PNG URL",
    group: "text-color",
    theme: "dark",
    type: "text-color",
    format: "png",
    isDarkMode: true,
  },
  {
    key: "png-brand-light",
    title: "Copy Brand Light PNG URL",
    group: "brand",
    theme: "light",
    type: "brand",
    format: "png",
    isDarkMode: false,
  },
  {
    key: "png-brand-dark",
    title: "Copy Brand Dark PNG URL",
    group: "brand",
    theme: "dark",
    type: "brand",
    format: "png",
    isDarkMode: true,
  },
  {
    key: "png-brand-color-light",
    title: "Copy Brand Color Light PNG URL",
    group: "brand-color",
    theme: "light",
    type: "brand-color",
    format: "png",
    isDarkMode: false,
  },
  {
    key: "png-brand-color-dark",
    title: "Copy Brand Color Dark PNG URL",
    group: "brand-color",
    theme: "dark",
    type: "brand-color",
    format: "png",
    isDarkMode: true,
  },
];

type VariantSection = {
  title: string;
  group: AssetVariantGroup;
};

const variantSections: VariantSection[] = [
  { title: "Mono", group: "mono" },
  { title: "Color", group: "color" },
  { title: "Text", group: "text" },
  { title: "Chinese Text", group: "text-cn" },
  { title: "Text Color", group: "text-color" },
  { title: "Brand", group: "brand" },
  { title: "Brand Color", group: "brand-color" },
];

function getAssetActions(icon: PreparedIconEntry, variants: AssetVariant[]) {
  return variants
    .filter((variant) => isAssetVariantAvailable(icon, variant))
    .map((variant) => {
      const content = getAssetUrl(icon, variant);

      return <Action.CopyToClipboard key={variant.key} title={variant.title} content={content} />;
    });
}

function getSvgActions(icon: PreparedIconEntry, variants: AssetVariant[]) {
  return variants
    .filter((variant) => isAssetVariantAvailable(icon, variant))
    .flatMap((variant) => {
      const title = variant.title.replace(" URL", "");

      return [
        <Action key={variant.key} title={title} onAction={() => copySvgContent(icon, variant)} />,
        <Action
          key={`${variant.key}-paste`}
          title={title.replace("Copy", "Paste")}
          onAction={() => pasteSvgContent(icon, variant)}
        />,
      ];
    });
}

function getSvgVariantsByGroup(group: AssetVariantGroup) {
  return svgVariants.filter((variant) => variant.group === group);
}

function getAvatarAction(icon: PreparedIconEntry) {
  if (!icon.param.hasAvatar) {
    return null;
  }

  return (
    <>
      <Action.CopyToClipboard
        title="Copy Avatar URL"
        content={getAssetUrl(icon, { key: "avatar", title: "", format: "avatar" })}
      />
    </>
  );
}

async function getSvgContent(icon: PreparedIconEntry, variant?: AssetVariant) {
  const assetVariant = variant ?? {
    key: "svg-primary",
    title: "Copy SVG",
    format: "svg",
    type: getPrimaryAssetType(icon),
  };
  const response = await fetch(getAssetUrl(icon, assetVariant));

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.text();
}

async function copySvgContent(icon: PreparedIconEntry, variant?: AssetVariant) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Copying SVG for ${icon.title}`,
  });

  try {
    const svg = await getSvgContent(icon, variant);
    await Clipboard.copy(svg);

    toast.style = Toast.Style.Success;
    toast.title = `Copied SVG for ${icon.title}`;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = `Failed to copy SVG for ${icon.title}`;
    toast.message = error instanceof Error ? error.message : "Unknown error";
  }
}

async function pasteSvgContent(icon: PreparedIconEntry, variant?: AssetVariant) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Pasting SVG for ${icon.title}`,
  });

  try {
    const svg = await getSvgContent(icon, variant);
    await Clipboard.paste(svg);

    toast.style = Toast.Style.Success;
    toast.title = `Pasted SVG for ${icon.title}`;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = `Failed to paste SVG for ${icon.title}`;
    toast.message = error instanceof Error ? error.message : "Unknown error";
  }
}

export function createIconActions(icon: PreparedIconEntry) {
  return (
    <ActionPanel title={icon.fullTitle}>
      <Action.CopyToClipboard
        title="Copy Component Name"
        content={icon.id}
        icon={Icon.Code}
        shortcut={{ macOS: { modifiers: ["cmd"], key: "c" }, Windows: { modifiers: ["ctrl"], key: "c" } }}
      />
      <Action.Paste title="Paste Component Name" content={icon.id} icon={Icon.Code} />
      <Action
        title="Copy SVG"
        icon={Icon.Document}
        shortcut={{ macOS: { modifiers: ["cmd"], key: "s" }, Windows: { modifiers: ["ctrl"], key: "s" } }}
        onAction={() => copySvgContent(icon)}
      />
      <Action
        title="Paste SVG"
        icon={Icon.Document}
        shortcut={{ macOS: { modifiers: ["opt"], key: "s" }, Windows: { modifiers: ["alt"], key: "s" } }}
        onAction={() => pasteSvgContent(icon)}
      />
      <ActionPanel.Submenu
        title="More Asset URLs"
        icon={Icon.Link}
        shortcut={{
          macOS: { modifiers: ["ctrl", "shift"], key: "a" },
          Windows: { modifiers: ["ctrl", "shift"], key: "a" },
        }}
      >
        <ActionPanel.Section title="SVG">{getAssetActions(icon, svgVariants)}</ActionPanel.Section>
        <ActionPanel.Section title="PNG">{getAssetActions(icon, pngVariants)}</ActionPanel.Section>
        {icon.param.hasAvatar ? (
          <ActionPanel.Section title="Avatar">{getAvatarAction(icon)}</ActionPanel.Section>
        ) : null}
      </ActionPanel.Submenu>
      <ActionPanel.Submenu
        title="More SVG Variants"
        icon={Icon.Document}
        shortcut={{
          macOS: { modifiers: ["ctrl", "shift"], key: "s" },
          Windows: { modifiers: ["ctrl", "shift"], key: "s" },
        }}
      >
        {variantSections.map((section) => {
          const actions = getSvgActions(icon, getSvgVariantsByGroup(section.group));

          if (actions.length === 0) {
            return null;
          }

          return (
            <ActionPanel.Section key={section.title} title={section.title}>
              {actions}
            </ActionPanel.Section>
          );
        })}
      </ActionPanel.Submenu>
    </ActionPanel>
  );
}
