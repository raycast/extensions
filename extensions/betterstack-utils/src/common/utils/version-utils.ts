/**
 * Raycast's v2 beta app track uses its own independent version numbering starting
 * from 0.x (confirmed: "0.67.1.0 (Beta)"), unrelated to and lower than the stable
 * v1 track's numbering (confirmed: "1.104.21"). A plain major-version comparison
 * against the stable track can't tell them apart, so this checks for either the
 * literal "beta" marker or a major version of 0. If Raycast v2 exits beta with a
 * new numbering scheme, this will need revisiting.
 */
export function isRaycastV2Beta(raycastVersion: string): boolean {
  if (/beta/i.test(raycastVersion)) return true;

  return Number.parseInt(raycastVersion, 10) === 0;
}
