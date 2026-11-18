import { Tool } from "@raycast/api";
import { Appearance, applyAppearance } from "../lib/appearance";
import { resolveIconName, searchIcons } from "../lib/icons";
import { fileUrl, imageMarkdown } from "../lib/preview";
import { exportPng, exportSvg, parseCustomSvg } from "../lib/render";
import { applyPreset, DEFAULT_SETTINGS, FillType, IconSettings, raySoUrl } from "../lib/settings";
import { Collection, getLibraryItem, recordHistory } from "../lib/library";

type Input = {
  /** Saved design ID returned by List Library. Use with sourceCollection to reuse its settings. */
  sourceId?: string;
  /** Collection containing sourceId: history, favorites, or templates. */
  sourceCollection?: Collection;
  /**
   * Requested appearance: "light" for a light background and readable glyph, "dark" for a dark background, or "both" for a matching pair. Always pass this when the user specifies light/dark. Omit to keep the supplied palette unchanged.
   */
  appearance?: "light" | "dark" | "both";
  /**
   * Raycast icon name from Search Icons, e.g. "rocket" or "cloud-sun". Optional with customSvg or a saved source; omit icon and customSvg to keep the saved glyph.
   */
  icon?: string;
  /**
   * A complete custom SVG glyph to use instead of a Raycast icon. Use a square viewBox and fill="currentColor" or stroke="currentColor".
   */
  customSvg?: string;
  /**
   * Preset index from List Presets (0-23). Explicit colors below override it.
   */
  preset?: number;
  /**
   * Background fill: "Linear", "Radial" or "Solid".
   */
  fillType?: FillType;
  /**
   * Background start color as hex, e.g. "#8E2DE2".
   */
  startColor?: string;
  /**
   * Background end color as hex, e.g. "#4A00E0".
   */
  endColor?: string;
  /**
   * Linear gradient angle in degrees (0-360).
   */
  angle?: number;
  /**
   * Radial gradient focal point as "x%,y%", e.g. "50%,0%" for light from the top.
   */
  position?: string;
  /**
   * Glyph color as hex. Defaults to the preset's icon color (usually white).
   */
  iconColor?: string;
  /**
   * Glyph size in pixels on the 512px canvas (default 352).
   */
  iconSize?: number;
  /**
   * Corner radius in pixels (default 128; 0 is square, 256 is a circle).
   */
  radius?: number;
  /**
   * Add the soft white radial glare from the top.
   */
  glare?: boolean;
  /**
   * Add the grain/noise texture.
   */
  noise?: boolean;
  /**
   * Border width in pixels (default 0).
   */
  strokeSize?: number;
  /**
   * Border color as hex.
   */
  strokeColor?: string;
  /**
   * Output file name without extension, e.g. "weather_icon".
   */
  fileName?: string;
  /**
   * PNG size in pixels (default 512).
   */
  pngSize?: number;
};

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export default async function tool(input: Input) {
  if (input.appearance !== undefined && !["light", "dark", "both"].includes(input.appearance)) {
    throw new Error("appearance must be light, dark, or both");
  }
  if (Boolean(input.sourceId) !== Boolean(input.sourceCollection))
    throw new Error("Provide both sourceId and sourceCollection to reuse a saved design");
  if (input.sourceCollection && !["history", "favorites", "templates"].includes(input.sourceCollection))
    throw new Error("Invalid source collection");
  const source =
    input.sourceId && input.sourceCollection ? getLibraryItem(input.sourceCollection, input.sourceId) : undefined;
  const icon = input.icon ? resolveIconName(input.icon) : input.customSvg ? undefined : source?.settings.icon;
  const customSvg = input.customSvg ?? (input.icon ? undefined : source?.settings.customSvg);
  if ((input.icon && !icon) || (!customSvg && !icon)) {
    const suggestions = input.icon ? searchIcons(input.icon.replace(/-/g, " "), 10) : [];
    throw new Error(
      `Unknown icon "${input.icon ?? ""}". Use Search Icons first.${suggestions.length ? ` Close matches: ${suggestions.join(", ")}` : ""}`,
    );
  }
  if (customSvg && !parseCustomSvg(customSvg)) {
    throw new Error("customSvg must be a complete <svg …>…</svg> document");
  }
  for (const color of [input.startColor, input.endColor, input.iconColor, input.strokeColor]) {
    if (color && !HEX.test(color)) throw new Error(`"${color}" is not a hex color like #FF8800`);
  }

  let settings: IconSettings = { ...(source?.settings ?? DEFAULT_SETTINGS) };
  if (input.preset !== undefined) settings = applyPreset(settings, input.preset);
  const overrides: Partial<IconSettings> = {
    fileName:
      input.fileName ||
      (!input.icon && !input.customSvg && source ? source.settings.fileName : `${icon ?? "custom"}_icon`),
    backgroundFillType: input.fillType,
    backgroundStartColor: input.startColor,
    backgroundEndColor: input.endColor,
    backgroundAngle: input.angle,
    backgroundPosition: input.position,
    iconColor: input.iconColor,
    iconSize: input.iconSize,
    backgroundRadius: input.radius,
    backgroundRadialGlare: input.glare,
    backgroundNoiseTexture: input.noise,
    backgroundStrokeSize: input.strokeSize,
    backgroundStrokeColor: input.strokeColor,
  };
  const customized = Object.entries(overrides).filter(([, value]) => value !== undefined);
  settings = { ...settings, ...Object.fromEntries(customized), icon: customSvg ? undefined : icon, customSvg };
  if (input.startColor || input.endColor || input.fillType) settings.selectedPresetIndex = null;

  const appearances: (Appearance | undefined)[] = input.appearance === "both" ? ["light", "dark"] : [input.appearance];
  const variants = [];
  for (const appearance of appearances) {
    const variant = appearance ? applyAppearance(settings, appearance) : { ...settings };
    if (appearance) variant.fileName = `${settings.fileName.replace(/\.(png|svg)$/i, "")}_${appearance}`;
    const pngPath = await exportPng(variant, input.pngSize ?? 512);
    const svgPath = exportSvg(variant);
    let historyId: string | undefined;
    let historyWarning: string | undefined;
    try {
      historyId = recordHistory(variant).id;
    } catch {
      historyWarning = "Files were exported successfully, but this icon could not be added to History.";
    }
    const title = appearance === "light" ? "Light Icon" : appearance === "dark" ? "Dark Icon" : "Icon";
    variants.push({
      appearance: appearance ?? "default",
      historyId,
      historyWarning,
      pngPath,
      svgPath,
      preview: imageMarkdown(pngPath, title),
      downloads: `[Open ${title} PNG](${fileUrl(pngPath)}) · [Open ${title} SVG](${fileUrl(svgPath)})`,
      raySoUrl: variant.customSvg ? undefined : raySoUrl(variant),
      settings: { ...variant, customSvg: variant.customSvg ? "(custom)" : undefined },
    });
  }

  return { ...variants[0], variants, preview: variants.map((variant) => variant.preview).join("\n\n") };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  if (!input.customSvg) return undefined;
  return {
    message: "Render this AI-drawn SVG into an icon?",
    info: [{ name: "File", value: input.fileName ?? "custom_icon" }],
  };
};
