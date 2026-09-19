/** The port the managed container must publish on, or null when the preference
 * names something this command cannot serve. The accepted set has to equal what
 * `containerArgs` binds, plain HTTP on 127.0.0.1: publishing one address while
 * polling another reports a failure for a detector that is running perfectly. */
/** fetch refuses these outright, so a container published on one would start
 * correctly and never answer. https://url.spec.whatwg.org/#port-blocked */
const BLOCKED_PORTS = new Set([
  1, 7, 9, 11, 13, 15, 17, 19, 20, 21, 22, 23, 25, 37, 42, 43, 53, 69, 77, 79,
  87, 95, 101, 102, 103, 104, 109, 110, 111, 113, 115, 117, 119, 123, 135, 137,
  139, 143, 161, 179, 389, 427, 465, 512, 513, 514, 515, 526, 530, 531, 532,
  540, 548, 554, 556, 563, 587, 601, 636, 989, 990, 993, 995, 1719, 1720, 1723,
  2049, 3659, 4045, 4190, 5060, 5061, 6000, 6566, 6665, 6666, 6667, 6668, 6669,
  6679, 6697, 10080,
]);

export function loopbackPort(baseUrl: string): number | null {
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    return null;
  }

  if (url.protocol !== "http:") return null;
  if (url.hostname !== "127.0.0.1") return null;
  // The health probe appends /health to the preference as written, so anything
  // before the path, or after it, would be probed at the wrong address.
  if (url.pathname !== "/") return null;
  // Tested on the raw string: URL reports an empty search and hash for a bare
  // trailing "?" or "#", and appending /health to either loses the path.
  if (baseUrl.includes("?") || baseUrl.includes("#")) return null;
  if (url.username !== "" || url.password !== "") return null;

  const port = url.port === "" ? 80 : Number(url.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) return null;
  return BLOCKED_PORTS.has(port) ? null : port;
}
