/** Accept IDs/slugs or canonical Are.na links without allowing path/query injection. */
export function arenaReference(raw: string, kind: "channel" | "block" | "user"): string {
  let value = raw.trim();
  if (/^https?:\/\//i.test(value)) {
    const url = new URL(value);
    if (!["are.na", "www.are.na"].includes(url.hostname) || url.username || url.password || url.port) {
      throw new Error("Use an Are.na URL.");
    }
    const parts = url.pathname.split("/").filter(Boolean).map(decodeURIComponent);
    if (kind === "block" && parts.length === 2 && parts[0] === "block") value = parts[1];
    else if (kind === "channel" && parts.length === 2 && !["block", "settings", "developers"].includes(parts[0]))
      value = parts[1];
    else if (kind === "user" && parts.length === 1) value = parts[0];
    else throw new Error(`Use an Are.na ${kind} URL.`);
  }
  // Also accept the owner/channel path commonly copied from an Are.na link.
  if (!/^https?:\/\//i.test(raw.trim()) && kind === "channel" && /^[\p{L}\p{N}_-]+\/[\p{L}\p{N}_-]+$/u.test(value)) {
    const [owner, slug] = value.split("/");
    if (!["block", "settings", "developers"].includes(owner)) value = slug;
  }
  if (!value || !/^[\p{L}\p{N}_-]+$/u.test(value)) throw new Error(`Invalid ${kind} ID or slug.`);
  if (kind === "block" && (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < 1)) {
    throw new Error("Block ID must be a positive integer.");
  }
  return value;
}

export function channelReferences(values: string[]): string[] {
  const refs = [...new Set(values.map((value) => arenaReference(value, "channel")))];
  if (refs.length < 1 || refs.length > 20) throw new Error("Choose between 1 and 20 channels.");
  return refs;
}

export function pagination(input: { page?: number; per?: number }, defaultPer = 24) {
  const page = input.page ?? 1;
  const per = input.per ?? defaultPer;
  if (!Number.isSafeInteger(page) || page < 1) throw new Error("Page must be a positive integer.");
  if (!Number.isSafeInteger(per) || per < 1 || per > 100) throw new Error("Per must be an integer between 1 and 100.");
  return { page, per };
}
