/**
 * Surface version string written to Cloudflare Images metadata as
 * `${surfaceVersion}` on each upload. Bump this manually when shipping a
 * meaningful behavioural change so future-you can correlate uploaded images
 * to extension versions in the CF dashboard.
 *
 * Why not read from package.json? Raycast extensions don't declare a
 * `version` field in their manifest — versioning is handled via the
 * CHANGELOG.md file. So we keep this as a hand-bumped constant.
 */
export const SURFACE_VERSION = "raycast-0.4.0";
