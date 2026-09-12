import { BackgroundColor } from "@adobe/leonardo-contrast-colors";

export const colorsKey = "__PALETTE_COLORS_CACHE_KEY__";
export const typeKey = "__PALETTE_COLORS_TYPE_KEY__";
export const baseBackgroundColor = new BackgroundColor({
  name: "random",
  colorKeys: ["#cadada"],
});
export const enum SchemeTypes {
  Mono = "mono",
  Contrast = "contrast",
  Tetrade = "tetrade",
  Analogic = "analogic",
}
