import { Color, Icon, Image } from "@raycast/api";

const ASSET_NAME = /\.(svg|png)$/;

/**
 * Raycast 2's menu bar renderer does not draw SVG strokes, and every icon in `assets` that is not
 * the extension logo is a stroke-only outline — so they are shipped as PNGs instead. A `tintColor`
 * does apply to raster assets, and `Color.PrimaryText` follows the current appearance, which is
 * what keeps them legible in both themes.
 *
 * The boilerplate payload from the WP Bones API still refers to the icons by their original
 * `.svg` name, so the extension is remapped here.
 */
const toRaster = (source: string) => source.replace(/\.svg$/, ".png");

export const getIcon = (icon: Image.ImageLike): Image.ImageLike => {
  // a bare asset name: tint it so it follows the current appearance
  if (typeof icon === "string") {
    return ASSET_NAME.test(icon) ? { source: toRaster(icon), tintColor: Color.PrimaryText } : icon;
  }

  if (typeof icon !== "object" || icon === null || !("source" in icon)) {
    return icon;
  }

  const { source } = icon;
  if (typeof source === "string" && ASSET_NAME.test(source)) {
    // an asset already declaring its own tint keeps it
    return { tintColor: Color.PrimaryText, ...icon, source: toRaster(source) };
  }

  return { ...icon, source: Icon[source as keyof typeof Icon] };
};
