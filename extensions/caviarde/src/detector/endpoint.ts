const LOOPBACK = new Set(["127.0.0.1", "::1", "localhost"]);

/** Null when the preference points somewhere this command cannot manage:
 * publishing on a fixed port while polling another reports a failure for a
 * detector that is running perfectly. */
export function loopbackPort(baseUrl: string): number | null {
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (!LOOPBACK.has(host)) return null;
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;

  const port =
    url.port === "" ? (url.protocol === "https:" ? 443 : 80) : Number(url.port);
  return Number.isInteger(port) && port > 0 && port < 65536 ? port : null;
}
