import { Color, Icon, Image } from "@raycast/api";

/**
 * Raycast 2's menu bar renderer does not draw SVG strokes, and every icon in `assets` that is not
 * the extension logo is a stroke-only outline — so they are shipped as PNGs instead. A `tintColor`
 * does apply to raster assets, and `Color.PrimaryText` follows the current appearance, which is
 * what keeps them legible in both themes.
 *
 * The boilerplate payload from the WP Bones API still refers to the icons by their original
 * `.svg` name, so the extension is remapped here.
 */
const rasterAsset = (source: string): Image.ImageLike => ({
  source: source.replace(/\.svg$/, ".png"),
  tintColor: Color.PrimaryText,
});

export const getIcon = (icon: Image.ImageLike): Image.ImageLike => {
  // a bare asset name: tint it so it follows the current appearance
  if (typeof icon === "string") {
    return icon.endsWith(".svg") || icon.endsWith(".png") ? rasterAsset(icon) : icon;
  }
  if ("source" in icon) {
    // an asset name keeps its own tint if it already declares one
    if (typeof icon.source === "string" && /\.(svg|png)$/.test(icon.source)) {
      return { ...rasterAsset(icon.source), ...icon, source: icon.source.replace(/\.svg$/, ".png") };
    }
    return { ...icon, source: Icon[icon.source as keyof typeof Icon] };
  }
  return icon;
};
