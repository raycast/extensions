/* @ts-expect-error untyped packaged */
import svgToDataURL from "svg-to-dataurl";

export const fetchColor = (color: string): string => {
  return svgToDataURL(`<?xml version="1.0" encoding="utf-8"?>
<svg width="400" height="180">
  <rect x="0" y="0" width="800" height="800"
  style="fill:${color};" />
</svg>`);
};
