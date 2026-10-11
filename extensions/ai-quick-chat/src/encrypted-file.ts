import { rm } from "node:fs/promises";

export function encryptedBackupPath(filePath: string): string {
  return `${filePath}.backup`;
}

export async function removeEncryptedFile(filePath: string): Promise<void> {
  await Promise.all([
    rm(filePath, { force: true }),
    rm(encryptedBackupPath(filePath), { force: true }),
  ]);
}
