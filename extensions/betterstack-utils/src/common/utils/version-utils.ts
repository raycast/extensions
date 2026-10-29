/**
 * Raycast v1 is the only track whose SVG renderer has the colored-fills-as-black bug and no
 * SMIL animation support, so it's the one that needs rasterizing. Version numbering across
 * tracks (confirmed):
 * - v1 stable: "1.104.21"
 * - v2 beta: "0.67.1.0 (Beta)" — its own independent numbering starting from 0.x
 * - v2 stable: "2.6.2.0"
 * Checking for v1 specifically, rather than for v2, keeps any future v2 numbering on the
 * SVG path.
 */
export function isRaycastV1(raycastVersion: string): boolean {
  if (/beta/i.test(raycastVersion)) return false;

  return Number.parseInt(raycastVersion, 10) === 1;
}
