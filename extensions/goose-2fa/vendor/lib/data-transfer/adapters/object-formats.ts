import type { NewAccountInput } from "../../types";
import { normalizeAlgorithm, normalizeType } from "../normalization";
import { parseAccountArray } from "./generic-accounts";

// ---- Format parsers ----

/** Our own goose-2fa backup */
export function tryGoose2fa(json: Record<string, unknown>): NewAccountInput[] | null {
  if (json.app === "goose-2fa" && Array.isArray(json.accounts)) {
    return parseAccountArray(json.accounts);
  }
  return null;
}

/** 2FAS Authenticator backup: { "services": [...], "updatedAt": ..., "schemaVersion": ... } */
export function try2FAS(json: Record<string, unknown>): NewAccountInput[] | null {
  if (!Array.isArray(json.services)) return null;
  const results: NewAccountInput[] = [];
  for (const svc of json.services as Record<string, unknown>[]) {
    const otp = svc.otp as Record<string, unknown> | undefined;
    const secret = (otp?.secret ?? svc.secret) as string | undefined;
    if (!secret) continue;

    results.push({
      name: ((otp?.account ?? otp?.label ?? svc.name ?? "Unknown") as string),
      issuer: ((otp?.issuer ?? svc.name ?? "") as string),
      secret: String(secret).replace(/\s/g, "").toUpperCase(),
      type: normalizeType((otp?.tokenType ?? otp?.type ?? "TOTP") as string),
      digits: parseInt(String(otp?.digits ?? 6)) || 6,
      period: parseInt(String(otp?.period ?? 30)) || 30,
      counter: parseInt(String(otp?.counter ?? 0)) || 0,
      algorithm: normalizeAlgorithm((otp?.algorithm ?? "SHA1") as string),
    });
  }
  return results.length > 0 ? results : null;
}

/** Aegis Authenticator backup: { "version": N, "db": { "entries": [...] } } */
export function tryAegis(json: Record<string, unknown>): NewAccountInput[] | null {
  const db = json.db as Record<string, unknown> | undefined;
  if (!db || !Array.isArray(db.entries)) return null;
  const results: NewAccountInput[] = [];
  for (const entry of db.entries as Record<string, unknown>[]) {
    const info = entry.info as Record<string, unknown> | undefined;
    const secret = (info?.secret ?? entry.secret) as string | undefined;
    if (!secret) continue;

    results.push({
      name: (entry.name as string) || "Unknown",
      issuer: (entry.issuer as string) || "",
      secret: String(secret).replace(/\s/g, "").toUpperCase(),
      type: normalizeType((entry.type ?? "totp") as string),
      digits: parseInt(String(info?.digits ?? 6)) || 6,
      period: parseInt(String(info?.period ?? 30)) || 30,
      counter: parseInt(String(info?.counter ?? 0)) || 0,
      algorithm: normalizeAlgorithm((info?.algo ?? info?.algorithm ?? "SHA1") as string),
    });
  }
  return results.length > 0 ? results : null;
}
