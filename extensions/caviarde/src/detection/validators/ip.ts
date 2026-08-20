/** Loopback, unspecified and link-local identify nobody, and masking them only
 * destroys debugging signal. */
export function isNonIdentifyingIp(value: string): boolean {
  const address = value.trim().toLowerCase();

  if (address === "::1" || address === "::") return true;
  if (/^fe[89ab][0-9a-f]:/.test(address)) return true;

  const parts = address.split(".");
  if (parts.length !== 4) return false;
  const [a, b] = parts.map(Number);
  if (a === undefined || b === undefined) return false;
  if (a === 127 || a === 0) return true;
  return a === 169 && b === 254;
}

export function isMaskableIpv4(value: string): boolean {
  const parts = value.split(".");
  if (
    parts.length !== 4 ||
    parts.some((p) => p.length > 3 || !/^\d+$/.test(p))
  ) {
    return false;
  }
  if (parts.map(Number).some((o) => o > 255)) return false;
  return !isNonIdentifyingIp(value);
}

/** Accepts exactly one `::` elision, or eight explicit groups. */
export function isMaskableIpv6(value: string): boolean {
  if (!value.includes(":")) return false;
  if (isNonIdentifyingIp(value)) return false;

  const elisions = value.split("::").length - 1;
  if (elisions > 1) return false;

  const groups = value.split(":").filter((g) => g !== "");
  if (groups.some((g) => !/^[0-9A-Fa-f]{1,4}$/.test(g))) return false;

  return elisions === 1 ? groups.length <= 7 : value.split(":").length === 8;
}
