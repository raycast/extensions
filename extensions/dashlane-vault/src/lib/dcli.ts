import { execPromise } from "@/helper/exec";
import { VaultCredential, VaultCredentialDto, VaultNote, VaultNoteDto } from "@/types/dcli";

export async function syncVault() {
  await execPromise("dcli sync");
}

export async function getVaultCredentials() {
  try {
    const { stdout } = await execPromise("dcli password --output json");
    return parseVaultCredentials(stdout);
  } catch (error) {
    return [];
  }
}

export async function getNotes() {
  try {
    const { stdout } = await execPromise("dcli note --output json");
    return parseNotes(stdout);
  } catch (error) {
    return [];
  }
}

export async function getPassword(id: string) {
  const { stdout } = await execPromise(`dcli password id=${id} -o password`);
  return stdout.trim();
}

export async function getOtpSecret(id: string) {
  const { stdout } = await execPromise(`dcli otp id=${id} --print`);
  return stdout.trim();
}

export async function logout() {
  await execPromise("dcli logout");
}

export async function checkIfCliIsInstalled() {
  try {
    await execPromise("dcli -V");
    return true;
  } catch (error) {
    return false;
  }
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
