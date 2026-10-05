/** `::1` also spells itself `0:0:0:0:0:0:0:1`, so the groups are compared
 * rather than the text. Returns null when the value is not IPv6 at all. */
function ipv6Groups(address: string): number[] | null {
  if (!address.includes(":")) return null;

  const halves = address.split("::");
  if (halves.length > 2) return null;

  // A trailing dotted quad is two more groups: `fe80::192.0.2.1`, `::ffff:127.0.0.1`.
  const quad = (part: string): number[] | null => {
    const octets = part.split(".").map(Number);
    if (octets.length !== 4) return null;
    if (octets.some((o) => !Number.isInteger(o) || o < 0 || o > 255))
      return null;
    return [
      ((octets[0] ?? 0) << 8) | (octets[1] ?? 0),
      ((octets[2] ?? 0) << 8) | (octets[3] ?? 0),
    ];
  };

  const parse = (part: string): number[] | null => {
    if (part === "") return [];
    const chunks = part.split(":");
    const groups: number[] = [];
    for (const [index, chunk] of chunks.entries()) {
      if (index === chunks.length - 1 && chunk.includes(".")) {
        const embedded = quad(chunk);
        if (embedded === null) return null;
        groups.push(...embedded);
        continue;
      }
      if (!/^[0-9a-f]{1,4}$/.test(chunk)) return null;
      groups.push(parseInt(chunk, 16));
    }
    return groups;
  };

  const head = parse(halves[0] ?? "");
  const tail = halves.length === 2 ? parse(halves[1] ?? "") : [];
  if (head === null || tail === null) return null;

  if (halves.length === 1) return head.length === 8 ? head : null;

  const elided = 8 - head.length - tail.length;
  return elided < 1 ? null : [...head, ...Array(elided).fill(0), ...tail];
}

/** Loopback, unspecified and link-local identify nobody, and masking them only
 * destroys debugging signal. */
export function isNonIdentifyingIp(value: string): boolean {
  const address = value.trim().toLowerCase();

  const groups = ipv6Groups(address);
  if (groups !== null) {
    const leading = groups.slice(0, 7).every((g) => g === 0);
    if (leading && (groups[7] === 0 || groups[7] === 1)) return true;

    // `::ffff:127.0.0.1` carries an IPv4 address; judge it by the IPv4 rules.
    const mapped =
      groups.slice(0, 5).every((g) => g === 0) && groups[5] === 0xffff;
    if (mapped) {
      const high = groups[6] ?? 0;
      const low = groups[7] ?? 0;
      return isNonIdentifyingIp(
        `${high >> 8}.${high & 0xff}.${low >> 8}.${low & 0xff}`,
      );
    }

    const first = groups[0] ?? 0;
    return first >= 0xfe80 && first <= 0xfebf;
  }

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
