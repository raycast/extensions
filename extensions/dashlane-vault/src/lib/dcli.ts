import { getPreferenceValues } from "@raycast/api";
import { existsSync } from "fs";
import { safeParse } from "valibot";

import { execFilePromise } from "@/helper/exec";
import { VaultCredential, VaultCredentialSchema, VaultNote, VaultNoteSchema } from "@/types/dcli";

const preferences = getPreferenceValues<Preferences>();

const CLI_PATH =
  preferences.cliPath ?? ["/usr/local/bin/dcli", "/opt/homebrew/bin/dcli"].find((path) => existsSync(path));

async function dcli(...args: string[]) {
  if (!CLI_PATH) {
    throw Error("Dashlane CLI is not found!");
  }

  const { stdout } = await execFilePromise(CLI_PATH, args, { maxBuffer: 4096 * 1024 });

  return stdout;
}

export async function syncVault() {
  await dcli("sync");
}

export async function getVaultCredentials() {
  try {
    const stdout = await dcli("password", "--output", "json");
    return parseVaultCredentials(stdout);
  } catch (error) {
    return [];
  }
}

export async function getNotes() {
  try {
    const stdout = await dcli("note", "--output", "json");
    return parseNotes(stdout);
  } catch (error) {
    return [];
  }
}

export async function getPassword(id: string) {
  const stdout = await dcli("read", `dl://${extractId(id)}/password`);
  return stdout.trim();
}

export async function getOtpSecret(id: string) {
  const result = await dcli("read", `dl://${extractId(id)}/otpSecret?otp+expiry`);
  const [otp, expireIn] = result.split(" ").map((item) => item.trim());
  return {
    otp,
    expireIn,
  };
}

function parseVaultCredentials(jsonString: string): VaultCredential[] {
  try {
    const parsed = JSON.parse(jsonString);
    if (!Array.isArray(parsed)) return [];

    const credentials: VaultCredential[] = [];
    for (const item of parsed) {
      const result = safeParse(VaultCredentialSchema, item);
      if (result.success) credentials.push(result.output);
    }
    return credentials;
  } catch (error) {
    return [];
  }
}

function parseNotes(jsonString: string): VaultNote[] {
  try {
    const parsed = JSON.parse(jsonString);
    if (!Array.isArray(parsed)) return [];

    const notes: VaultNote[] = [];
    for (const item of parsed) {
      if (item.attachments && typeof item.attachments === "string") {
        try {
          item.attachments = JSON.parse(item.attachments);
        } catch (error) {
          // Do nothing
        }
      }

      const result = safeParse(VaultNoteSchema, item);
      if (result.success) notes.push(result.output);
    }
    return notes;
  } catch (error) {
    return [];
  }
}

/**
 * Dashlane CLI returns the ID in the format of `{id}`.
 * @returns Id without curly braces.
 */
function extractId(id: string) {
  if (id.startsWith("{") && id.endsWith("}")) {
    return id.slice(1, -1);
  }
  return id;
}
