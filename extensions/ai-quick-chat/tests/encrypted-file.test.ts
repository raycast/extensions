import assert from "node:assert/strict";
import { access, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { encryptedBackupPath, removeEncryptedFile } from "../src/encrypted-file";

test("removes both an encrypted file and its recovery backup", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ai-quick-chat-encrypted-file-"));
  const filePath = path.join(directory, "session.chat");
  const backupPath = encryptedBackupPath(filePath);

  try {
    await Promise.all([writeFile(filePath, "primary"), writeFile(backupPath, "backup")]);
    await removeEncryptedFile(filePath);
    await assert.rejects(access(filePath), { code: "ENOENT" });
    await assert.rejects(access(backupPath), { code: "ENOENT" });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
