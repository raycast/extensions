const OCTET = "(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)";
export const IPV4_PATTERN = new RegExp(`^(?:${OCTET}\\.){3}${OCTET}$`);

export const isIPv4 = (value: string): boolean => IPV4_PATTERN.test(value.trim());

interface IpSource {
  url: string;
  extract: (body: string) => string;
}

/** Free, keyless echo services. The ipify host below answers over IPv4 only, so it never returns an IPv6 address. */
const SOURCES: IpSource[] = [
  {
    url: "https://api.ipify.org?format=json",
    extract: (body) => String((JSON.parse(body) as { ip?: string }).ip ?? ""),
  },
  { url: "https://checkip.amazonaws.com", extract: (body) => body.trim() },
];

/** Detects the caller's public IPv4 address. Tries each source in order and fails only when all of them do. */
export async function detectPublicIPv4(fetchImpl: typeof fetch = fetch, timeoutMs = 5_000): Promise<string> {
  const failures: string[] = [];
  for (const source of SOURCES) {
    try {
      const response = await fetchImpl(source.url, { signal: AbortSignal.timeout(timeoutMs) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const ip = source.extract(await response.text()).trim();
      if (!isIPv4(ip)) throw new Error(`unexpected response "${ip.slice(0, 40)}"`);
      return ip;
    } catch (error) {
      failures.push(`${new URL(source.url).host}: ${(error as Error).message}`);
    }
  }
  throw new Error(`Could not detect your public IPv4 address (${failures.join("; ")}).`);
}
