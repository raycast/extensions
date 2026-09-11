import { environment } from "@raycast/api";

/** Keep in sync with the latest released version in CHANGELOG.md. */
export const EXTENSION_VERSION = "1.2";

export const IPCHECK_URL = "https://ipcheck.ing";

/**
 * Identify ourselves to every service we query, following the convention used by
 * other Raycast extensions: `Raycast/<raycast version> <extension>/<version>`.
 */
export const USER_AGENT = `Raycast/${environment.raycastVersion} IPCheck/${EXTENSION_VERSION}`;

/** Every outbound request is capped so a blackholed endpoint can't hang the command. */
export const REQUEST_TIMEOUT_MS = 8_000;
