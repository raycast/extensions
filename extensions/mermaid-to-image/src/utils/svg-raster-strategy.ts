import type { SvgRasterStrategy } from "../renderers/types";

const LINE_MARKER_PATTERN = /<line\b[^>]*marker-(?:start|end)=/i;
const CUSTOM_POLYLINE_MARKER_PATTERN =
  /<polyline\b[^>]*marker-(?:start|end)="url\(#(?!arrowhead(?:-start)?\))[^"]+\)"/i;
const CUSTOM_MARKER_DEF_PATTERN = /<marker\b[^>]*id="arrowhead-[^"]+"/i;
const XYCHART_LINE_PATH_PATTERN = /<path\b[^>]*class="[^"]*\bxychart-line\b[^"]*"/i;
const XYCHART_ROOT_PATTERN = /<svg\b[^>]*\bdata-xychart-colors=|\.xychart-line\b/i;

function requiresBrowserRasterForXychart(svgContent: string): boolean {
  return XYCHART_ROOT_PATTERN.test(svgContent) && XYCHART_LINE_PATH_PATTERN.test(svgContent);
}

function requiresBrowserRasterForCustomFlowchartMarkers(svgContent: string): boolean {
  return CUSTOM_POLYLINE_MARKER_PATTERN.test(svgContent) || CUSTOM_MARKER_DEF_PATTERN.test(svgContent);
}

export function resolveSvgRasterStrategy(svgContent: string): SvgRasterStrategy {
  if (LINE_MARKER_PATTERN.test(svgContent)) {
    return "browser";
  }

  if (requiresBrowserRasterForCustomFlowchartMarkers(svgContent)) {
    return "browser";
  }

  if (requiresBrowserRasterForXychart(svgContent)) {
    return "browser";
  }

  return "macos";
}
