import { parseAuthority } from "./authority";

/**
 * The URL schemes a connection is allowed to open. macOS will hand any registered scheme to
 * whatever app claims it, so a URL arriving from an archive or typed into a form is held to the
 * remote-desktop protocols this extension exists to open.
 */
const CONNECTABLE_SCHEMES = ["vnc", "ssh", "rdp"];

export function hasConnectableScheme(url: string): boolean {
  const scheme = /^([a-z][a-z0-9+.-]*):\/\//i.exec(url.trim());
  return scheme !== null && CONNECTABLE_SCHEMES.includes(scheme[1].toLowerCase());
}

/**
 * A URL this extension can open. It is passed to `open()` as it stands, so its authority is held to
 * the same rules as one assembled from separate parts: a host naming nothing, or a port outside the
 * range, reaches no machine whatever the scheme says.
 */
export function isConnectableUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!hasConnectableScheme(trimmed)) return false;

  const rest = trimmed.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "").replace(/[/?#].*$/, "");
  return parseAuthority(rest.slice(rest.lastIndexOf("@") + 1)) !== undefined;
}

export const CONNECTABLE_SCHEME_LIST = CONNECTABLE_SCHEMES.map((scheme) => `${scheme}://`).join(", ");
