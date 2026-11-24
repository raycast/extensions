import { Color, environment } from "@raycast/api";
import { toImageDataUri, toSvgDataUri } from "@/common/utils/svg-utils";
import { isRaycastV1 } from "@/common/utils/version-utils";
import { Appearance, getThemeColor } from "@/common/colors";
import { rangeOf } from "@/common/utils/collection-utils";
import { buildPulseRings } from "@/ui/schedule/pulse-animation";

const FRAME_COUNT = 2;
const ANIMATED_ICON_SIZE = 56;
const ANIMATED_DOT_RADIUS = 12;

/**
 * Same SMIL pulse as the on-call avatars, sized so the dot keeps roughly the same list icon
 * footprint as the static frames and the expanding rings stay inside the viewBox.
 */
export function buildAnimatedPulseIcon(color: string): string {
  const center = ANIMATED_ICON_SIZE / 2;
  const textColor = getThemeColor(color);

  return (
    `<svg width="${ANIMATED_ICON_SIZE}" height="${ANIMATED_ICON_SIZE}" viewBox="0 0 ${ANIMATED_ICON_SIZE} ${ANIMATED_ICON_SIZE}" xmlns="http://www.w3.org/2000/svg">` +
    buildPulseRings(center, center, ANIMATED_DOT_RADIUS, color) +
    `<circle cx="${center}" cy="${center}" r="${ANIMATED_DOT_RADIUS}" fill="${color}" stroke="${textColor}" stroke-width="1" stroke-opacity="0.5" />` +
    `</svg>`
  );
}

/**
 * Static fallback for Raycast v1, which gets rasterized PNGs and so can't play SMIL animations;
 * `usePulseIcons` cycles these frames instead.
 */
export function buildPulseFrames(color: string): string[] {
  return rangeOf(FRAME_COUNT).map((frame) => {
    const radius = 6 + frame;
    const opacity = (0.45 * (1 - frame / (FRAME_COUNT - 1))).toFixed(2);

    return `<svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
        <circle cx="8" cy="8" r="${radius}" fill="none" stroke="${color}" stroke-width="1.5" opacity="${opacity}" />
        <circle cx="8" cy="8" r="3" fill="${color}" />
      </svg>`;
  });
}

export function supportsAnimatedPulse(): boolean {
  return !isRaycastV1(environment.raycastVersion);
}

export async function getPulseFrames(color: Color.Dynamic, appearance: Appearance): Promise<string[]> {
  const hex = appearance === Appearance.LIGHT ? color.light : color.dark;

  if (supportsAnimatedPulse()) return [toSvgDataUri(buildAnimatedPulseIcon(hex))];

  return Promise.all(
    buildPulseFrames(hex).map((svg) => toImageDataUri(svg, environment.supportPath, environment.raycastVersion)),
  );
}
