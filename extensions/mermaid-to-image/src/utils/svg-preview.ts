export interface SvgPixelDimensions {
  width: number;
  height: number;
}

function parseNumericDimension(value: string | undefined): number | null {
  if (!value) return null;
  const match = value.trim().match(/^([0-9]+(?:\.[0-9]+)?)(?:px)?$/i);
  if (!match) return null;
  const numeric = Number(match[1]);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

export function parseSvgPixelDimensions(svgContent: string): SvgPixelDimensions | null {
  const svgTagMatch = svgContent.match(/<svg\b[^>]*>/i);
  const svgTag = svgTagMatch?.[0] ?? "";

  const widthAttr = svgTag.match(/\bwidth="([^"]+)"/i)?.[1];
  const heightAttr = svgTag.match(/\bheight="([^"]+)"/i)?.[1];
  const width = parseNumericDimension(widthAttr);
  const height = parseNumericDimension(heightAttr);

  if (width && height) {
    return { width, height };
  }

  const viewBoxAttr = svgTag.match(/\bviewBox="([^"]+)"/i)?.[1];
  if (!viewBoxAttr) return null;

  const parts = viewBoxAttr
    .trim()
    .split(/\s+/)
    .map((part) => Number(part));

  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) {
    return null;
  }

  const viewBoxWidth = parts[2];
  const viewBoxHeight = parts[3];
  if (viewBoxWidth <= 0 || viewBoxHeight <= 0) return null;

  return { width: viewBoxWidth, height: viewBoxHeight };
}

export function getSupersampledSize(
  dimensions: SvgPixelDimensions,
  factor: number,
  maxEdge: number,
): SvgPixelDimensions {
  const targetWidth = dimensions.width * factor;
  const targetHeight = dimensions.height * factor;

  const limitScale = Math.min(1, maxEdge / Math.max(targetWidth, targetHeight));
  const width = Math.max(1, Math.round(targetWidth * limitScale));
  const height = Math.max(1, Math.round(targetHeight * limitScale));

  return { width, height };
}
