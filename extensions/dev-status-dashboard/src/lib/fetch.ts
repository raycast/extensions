/** GET a JSON document with a hard timeout. Redirects are followed (Anthropic et al. 30x to their CDN). */
export async function fetchJson<T>(url: string, timeoutMs = 10000): Promise<T> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { Accept: "application/json" },
    redirect: "follow",
  });
  if (!response.ok) {
    throw new Error(`Request failed (${response.status} ${response.statusText})`);
  }
  return (await response.json()) as T;
}

/**
 * GET a JSON document served as UTF-16 with a BOM (NUL-interleaved bytes) — AWS's public health
 * feed does this (big-endian, `FE FF`), so `response.json()` would choke. We read the raw bytes,
 * pick the endianness from the BOM, and strip it before parsing.
 */
export async function fetchJsonUtf16<T>(url: string, timeoutMs = 10000): Promise<T> {
  const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), redirect: "follow" });
  if (!response.ok) {
    throw new Error(`Request failed (${response.status} ${response.statusText})`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  const littleEndian = bytes[0] === 0xff && bytes[1] === 0xfe;
  const text = new TextDecoder(littleEndian ? "utf-16le" : "utf-16be").decode(bytes).replace(/^\uFEFF/, "");
  return JSON.parse(text) as T;
}
