import { readFile } from "node:fs/promises";

export type CredentialCheck =
  { status: "authenticated"; key: string } | { status: "signed_out" } | { status: "unverified" };

/** A missing file is different from an unreadable or partially written file. */
export async function readCredentialFile(
  filePath: string,
): Promise<{ status: "read"; value: Record<string, unknown> } | { status: "missing" } | { status: "unverified" }> {
  try {
    const value: unknown = JSON.parse(await readFile(filePath, "utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value)) return { status: "unverified" };
    return { status: "read", value: value as Record<string, unknown> };
  } catch (error) {
    return error && typeof error === "object" && "code" in error && error.code === "ENOENT"
      ? { status: "missing" }
      : { status: "unverified" };
  }
}
