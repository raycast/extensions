export function isValidIPv4(ip: string): boolean {
  const parts = ip.split(".");
  if (parts.length !== 4) return false;
  return parts.every((p) => {
    const num = parseInt(p, 10);
    return !isNaN(num) && num >= 0 && num <= 255 && String(num) === p;
  });
}

export function isValidIPv6(ip: string): boolean {
  if (ip.includes("::")) {
    const sides = ip.split("::");
    if (sides.length > 2) return false;
    const totalGroups = (sides[0] ? sides[0].split(":").length : 0) + (sides[1] ? sides[1].split(":").length : 0);
    if (totalGroups > 7) return false;
  } else {
    if (ip.split(":").length !== 8) return false;
  }
  return ip.split(":").every((g) => g === "" || /^[0-9a-fA-F]{1,4}$/.test(g));
}

export function isValidPrefix(input: string): boolean {
  const trimmed = input.trim();
  const slashIdx = trimmed.indexOf("/");

  if (slashIdx === -1) {
    return isValidIPv4(trimmed) || isValidIPv6(trimmed);
  }

  const ip = trimmed.slice(0, slashIdx);
  const subnet = parseInt(trimmed.slice(slashIdx + 1), 10);
  if (isNaN(subnet)) return false;
  if (isValidIPv4(ip)) return subnet >= 0 && subnet <= 32;
  if (isValidIPv6(ip)) return subnet >= 0 && subnet <= 128;
  return false;
}

/** Ensure a prefix always has a CIDR suffix (single IPs get /32 or /128). */
export function normalizePrefix(input: string): string {
  const trimmed = input.trim();
  if (trimmed.includes("/")) return trimmed;
  if (isValidIPv4(trimmed)) return `${trimmed}/32`;
  if (isValidIPv6(trimmed)) return `${trimmed}/128`;
  return trimmed;
}

/** Parse a single line from bulk IP input. Returns normalized prefix or null if invalid/empty. */
export function parseBulkIPLine(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;
  if (isValidPrefix(trimmed)) return normalizePrefix(trimmed);
  return null;
}
