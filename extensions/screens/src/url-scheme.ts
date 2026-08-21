/**
 * The URL schemes a connection is allowed to open. macOS will hand any registered scheme to
 * whatever app claims it, so a URL arriving from an archive or typed into a form is held to the
 * remote-desktop protocols this extension exists to open.
 */
const CONNECTABLE_SCHEMES = ["vnc", "ssh", "rdp"];

export function isConnectableUrl(url: string): boolean {
  const scheme = /^([a-z][a-z0-9+.-]*):\/\//i.exec(url.trim());
  return scheme !== null && CONNECTABLE_SCHEMES.includes(scheme[1].toLowerCase());
}

/** How the allowed schemes read in a message to the user. */
export const CONNECTABLE_SCHEME_LIST = CONNECTABLE_SCHEMES.map((scheme) => `${scheme}://`).join(", ");
