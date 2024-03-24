import { getPreferenceValues } from "@raycast/api";
import { existsSync } from "fs";
import { safeParse } from "valibot";

import { getMasterPassword } from "@/helper/master-password";
import { VaultCredential, VaultCredentialSchema, VaultNote, VaultNoteSchema } from "@/types/dcli";
import { exec } from "child_process";
import { execa } from "execa";
import { execFile } from "child_process";
import util from "util";

export const execFilePromis = util.promisify(execFile);
const preferences = getPreferenceValues<Preferences>();

const CLI_PATH =
  preferences.cliPath ?? ["/usr/local/bin/dcli", "/opt/homebrew/bin/dcli"].find((path) => existsSync(path));

async function dcli(...args: string[]) {
  console.log(args);
  
  if (!CLI_PATH) {
    throw new Error("Dashlane CLI is not found!");
  }
  // const masterPassword = preferences.useTouchID ? await getMasterPassword() : null;

  const { stdout, stderr } = await execFilePromis(CLI_PATH, args, { maxBuffer: 4096 * 1024 });

  console.log(stdout, stderr);
  // reopen raycast as touchid closes the window
  // exec("open -a Raycast.app");
  if (stderr && stderr.length > 1) {
    throw new Error(`Failed to execute Dashlane CLI ${stderr}`);
  }
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
  const stdout = await dcli("password", `id=${id}`, "--output", "password");
  return stdout.trim();
}

export async function getOtpSecret(id: string) {
  const stdout = await dcli("otp", `id=${id}`, "--print");
  return stdout.trim();
}

export async function encryptVault() {
  await dcli("configure", "save-master-password", "false");
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
