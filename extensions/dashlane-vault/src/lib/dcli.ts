import { getPreferenceValues } from "@raycast/api";
import { existsSync } from "fs";

import { execFilePromis } from "@/helper/exec";
import { VaultCredential, VaultCredentialDto, VaultNote, VaultNoteDto } from "@/types/dcli";

const preferences = getPreferenceValues<Preferences>();

const CLI_PATH =
  preferences.cliPath ?? ["/usr/local/bin/dcli", "/opt/homebrew/bin/dcli"].find((path) => existsSync(path));

async function dcli(...args: string[]) {
  if (CLI_PATH) {
    const { stdout } = await execFilePromis(CLI_PATH, args, { maxBuffer: 4096 * 1024 });
    return stdout;
  }

  throw Error("Dashlane CLI is not found!");
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

function parseVaultCredential(dto: VaultCredentialDto): VaultCredential {
  return {
    ...dto,
    autoLogin: dto.autoLogin === "true",
    autoProtected: dto.autoProtected === "true",
    checked: dto.checked === "true",
    lastBackupTime: parseInt(dto.lastBackupTime),
    lastUse: parseInt(dto.lastUse),
    modificationDatetime: parseInt(dto.modificationDatetime),
    numberUse: parseInt(dto.numberUse),
    strength: parseInt(dto.strength),
    subdomainOnly: dto.subdomainOnly === "true",
    useFixedUrl: dto.useFixedUrl === "true",
  };
}

function parseVaultCredentials(jsonString: string): VaultCredential[] {
  try {
    const parsed = JSON.parse(jsonString) as VaultCredentialDto[];
    return parsed.map(parseVaultCredential);
  } catch (error) {
    return [];
  }
}

function parseNote(dto: VaultNoteDto): VaultNote {
  return {
    ...dto,
    attachments: dto.attachments ? JSON.parse(dto.attachments) : undefined,
    creationDatetime: parseInt(dto.creationDatetime ?? "0"),
    lastBackupTime: parseInt(dto.lastBackupTime ?? "0"),
    secured: dto.secured === "true",
    updateDate: parseInt(dto.updateDate ?? "0"),
    userModificationDatetime: parseInt(dto.userModificationDatetime ?? "0"),
    creationDate: parseInt(dto.creationDate ?? "0"),
    lastUse: parseInt(dto.lastUse ?? "0"),
  };
}

function parseNotes(jsonString: string) {
  try {
    const parsed = JSON.parse(jsonString) as VaultNoteDto[];
    return parsed.map(parseNote);
  } catch (error) {
    return [];
  }
}
