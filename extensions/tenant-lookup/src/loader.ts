import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import type { Preferences, Tenant } from "./types";

/** Expand a leading ~ to the user's home directory. */
export function expandTilde(p: string): string {
  if (!p) return p;
  if (p === "~") return homedir();
  if (p.startsWith("~/")) return join(homedir(), p.slice(2));
  return p;
}

/** Parse a JSON string into a validated Tenant[]. Throws on malformed input. */
function parseAndValidate(text: string, sourceLabel: string): Tenant[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error(`Could not parse JSON from ${sourceLabel}: ${(e as Error).message}`);
  }
  if (!Array.isArray(data)) {
    throw new Error(`Expected a JSON array of { uuid, name } in ${sourceLabel}.`);
  }

  const tenants: Tenant[] = [];
  for (const row of data) {
    if (
      row &&
      typeof row === "object" &&
      typeof (row as Record<string, unknown>).uuid === "string" &&
      typeof (row as Record<string, unknown>).name === "string"
    ) {
      const r = row as Record<string, string>;
      // Trim and drop rows with an empty/whitespace-only uuid or name, matching
      // the maintainer dump script (which filters out falsy ids/names). Otherwise
      // blank entries show in the list and can be copied/pasted.
      const uuid = r.uuid.trim();
      const name = r.name.trim();
      if (uuid && name) {
        tenants.push({ uuid, name });
      }
    }
  }

  if (tenants.length === 0) {
    throw new Error(`No valid, non-empty { uuid, name } entries found in ${sourceLabel}.`);
  }
  return tenants;
}

async function readLocal(localPath: string): Promise<Tenant[]> {
  const path = expandTilde((localPath ?? "").trim());
  if (!path) {
    throw new Error("Local file path is empty. Set it in the extension preferences.");
  }
  if (!existsSync(path)) {
    throw new Error(`Local file not found: ${path}`);
  }
  const text = await readFile(path, "utf8");
  return parseAndValidate(text, path);
}

// AWS SDK error names that specifically mean the caller's credentials are
// missing/expired — i.e. the fix really is `aws sso login`.
const CREDENTIAL_ERROR_NAMES = new Set([
  "CredentialsProviderError", // credential chain resolved no provider
  "TokenProviderError", // SSO token missing / expired / invalid
  "ExpiredToken", // STS temporary credentials expired
  "ExpiredTokenException",
  "InvalidIdentityToken",
  "TokenRefreshRequired",
]);

/**
 * Does this error mean the AWS credentials are missing or expired (so the fix is
 * `aws sso login`)? Keyed off specific SDK error names and precise SSO phrases —
 * deliberately NOT the bare word "expired" (or "the security token"), which also
 * appear in unrelated AWS/S3 errors and would misdirect users to the wrong fix.
 */
function isCredentialError(err: Error): boolean {
  if (err.name && CREDENTIAL_ERROR_NAMES.has(err.name)) return true;
  const m = (err.message ?? "").toLowerCase();
  // The SDK's SSO-expiry error reads: "The SSO session associated with this
  // profile has expired or is otherwise invalid. To refresh this SSO session run
  // aws sso login ...". Match those precise phrases, not a bare "expired".
  return m.includes("sso session") || m.includes("aws sso login") || m.includes("could not load credentials");
}

async function readS3(prefs: Preferences): Promise<Tenant[]> {
  const bucket = (prefs.bucket ?? "").trim();
  const key = (prefs.key ?? "").trim();
  const region = (prefs.region ?? "").trim() || "us-east-1";
  const profile = (prefs.profile ?? "").trim();

  if (!bucket || !key) {
    throw new Error("S3 bucket/key not set. Configure them in the extension preferences.");
  }

  const client = new S3Client({
    region,
    credentials: fromNodeProviderChain(profile ? { profile } : {}),
  });

  try {
    const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    if (!res.Body) {
      throw new Error("Empty response body.");
    }
    const text = await res.Body.transformToString("utf-8");
    return parseAndValidate(text, `s3://${bucket}/${key}`);
  } catch (err) {
    const e = err as Error;
    if (isCredentialError(e)) {
      const p = profile || "<profile>";
      throw new Error(
        `AWS SSO session is not active for profile "${p}".\n\n` +
          `Run this in a terminal, then reload:\n\naws sso login --profile ${p}`,
      );
    }
    if (e.name === "AccessDenied" || e.name === "Forbidden") {
      throw new Error(
        `Access denied reading s3://${bucket}/${key} with profile "${profile || "default"}". ` +
          `Your AWS identity is authenticated but may lack s3:GetObject on this object.`,
      );
    }
    if (e.name === "NoSuchKey" || e.name === "NoSuchBucket" || e.name === "NotFound") {
      throw new Error(`Not found: s3://${bucket}/${key}. Check the bucket and key in the extension preferences.`);
    }
    throw new Error(`Failed to read s3://${bucket}/${key}: ${e.message}`);
  }
}

/** Load tenants according to the configured source, with local-first fallback in "auto" mode. */
export async function loadTenants(prefs: Preferences): Promise<Tenant[]> {
  const localPath = (prefs.localPath ?? "").trim();
  const localAvailable = !!localPath && existsSync(expandTilde(localPath));

  switch (prefs.source) {
    case "local":
      return readLocal(prefs.localPath);
    case "s3":
      return readS3(prefs);
    case "auto":
    default:
      return localAvailable ? readLocal(prefs.localPath) : readS3(prefs);
  }
}
