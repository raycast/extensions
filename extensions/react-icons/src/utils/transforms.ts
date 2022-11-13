export function transformJsxToHtml(svg: string) {
  return svg
    .replaceAll(/ariaHidden/g, "aria-hidden")
    .replaceAll(/fillRule/g, "fill-rule")
    .replaceAll(/clipRule/g, "clip-rule")
    .replaceAll(/strokeWidth/g, "stroke-width");
}
