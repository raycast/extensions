import { execf } from "./exec";

/** Apple Silicon Macs publish their marketing name (e.g. "MacBook Pro (16-inch, 2021)")
 *  as a device-tree property; ioreg emits it as base64 plist <data> with a trailing NUL.
 *  Intel Macs have no such property and report "Unknown". */
export function parseProductNameFromIoreg(output: string): string | null {
  // The ioreg dump carries dozens of <data> properties; anchor to the key.
  const data = output.match(/<key>product-name<\/key>\s*<data>\s*([A-Za-z0-9+/=\s]+?)\s*<\/data>/)?.[1];
  if (!data) {
    return null;
  }

  const decoded = Buffer.from(data.replace(/\s/g, ""), "base64").toString("utf8").replace(/\0+$/, "").trim();

  return decoded || null;
}

export function extractReleaseYear(productName: string | null): string {
  return productName?.match(/\b(19|20)\d{2}\b/)?.[0] ?? "Unknown";
}

export async function getModelYear(): Promise<string> {
  try {
    const output = await execf("/usr/sbin/ioreg", ["-ar", "-k", "product-name", "-d1"]);
    return extractReleaseYear(parseProductNameFromIoreg(output));
  } catch {
    return "Unknown";
  }
}
