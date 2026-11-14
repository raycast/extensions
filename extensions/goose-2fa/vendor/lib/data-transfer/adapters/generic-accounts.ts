import type { NewAccountInput } from "../../types";
import { normalizeAlgorithm, normalizeType } from "../normalization";

/** Generic fallback: any JSON array or object with accounts that have a "secret" field */
export function parseAccountArray(arr: unknown[]): NewAccountInput[] {
  const results: NewAccountInput[] = [];
  for (const a of arr as Record<string, unknown>[]) {
    const secret = a.secret as string | undefined;
    if (!secret) continue;

    let name = ((a.name ?? a.label ?? a.account ?? "") as string);
    let issuer = ((a.issuer ?? a.issuerExt ?? "") as string);

    if (!issuer && name.includes(":")) {
      const idx = name.indexOf(":");
      issuer = name.slice(0, idx).trim();
      name = name.slice(idx + 1).trim();
    }

    results.push({
      name: name || issuer || "Unknown",
      issuer,
      secret: String(secret).replace(/\s/g, "").toUpperCase(),
      type: normalizeType((a.type ?? a.tokenType ?? a.kind ?? "totp") as string),
      digits: parseInt(String(a.digits ?? 6)) || 6,
      period: parseInt(String(a.period ?? a.timer ?? 30)) || 30,
      counter: parseInt(String(a.counter ?? 0)) || 0,
      algorithm: normalizeAlgorithm((a.algorithm ?? a.algo ?? "SHA1") as string),
    });
  }
  return results;
}
