import { homedir } from "node:os";
import { join } from "node:path";

import { readCredentialFile } from "../agents/credential-check.ts";
import type { CredentialCheck } from "../agents/credential-check.ts";

export async function checkAmpCredentials(
  filePath = join(homedir(), ".local", "share", "amp", "secrets.json"),
  env: NodeJS.ProcessEnv = process.env,
): Promise<CredentialCheck> {
  if (env.AMP_API_KEY?.trim()) {
    return { status: "authenticated", key: JSON.stringify([env.AMP_URL ?? "", env.AMP_API_KEY.trim()]) };
  }
  const result = await readCredentialFile(filePath);
  if (result.status === "missing") return { status: "signed_out" };
  if (result.status === "unverified") return result;
  // Include endpoint scope as well as key material. Ignore unrelated MCP secrets.
  const entries = Object.entries(result.value)
    .filter(([key, value]) => key.startsWith("apiKey@") && typeof value === "string" && value.trim())
    .sort(([left], [right]) => left.localeCompare(right));
  if (entries.length) return { status: "authenticated", key: JSON.stringify([env.AMP_URL ?? "", entries]) };
  // Unknown credential formats must not be mistaken for logout.
  return Object.keys(result.value).length ? { status: "unverified" } : { status: "signed_out" };
}
