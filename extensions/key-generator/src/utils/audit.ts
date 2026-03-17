import fs from "fs/promises";
import path from "path";
import os from "os";
import { scanSSHDirectory } from "./filesystem";

export interface AuditIssue {
  title: string;
  description: string;
  filePath: string;
  type: "permission" | "orphan" | "weak" | "duplicate" | "passphrase";
}

export async function auditSSHKeys(): Promise<AuditIssue[]> {
  const issues: AuditIssue[] = [];
  const sshDir = path.join(os.homedir(), ".ssh");
  const keys = await scanSSHDirectory();
  const files = await fs.readdir(sshDir);

  const fingerprintCounts: { [key: string]: string[] } = {};
  for (const key of keys) {
    if (!key.fingerprint) {
      continue;
    }
    if (!fingerprintCounts[key.fingerprint]) {
      fingerprintCounts[key.fingerprint] = [];
    }
    fingerprintCounts[key.fingerprint].push(key.name);
  }

  for (const [fingerprint, names] of Object.entries(fingerprintCounts)) {
    if (names.length > 1) {
      issues.push({
        title: "Duplicate Fingerprint",
        description: `Fingerprint ${fingerprint} is shared by: ${names.join(", ")}`,
        filePath: path.join(sshDir, names[0]),
        type: "duplicate",
      });
    }
  }

  for (const key of keys) {
    if (key.storageType === "file" && !key.hasPassphrase) {
      issues.push({
        title: "Missing Passphrase",
        description: `Key '${key.name}' has no passphrase protecting the private file.`,
        filePath: key.privateKeyPath,
        type: "passphrase",
      });
    }
  }

  const sshDirStats = await fs.stat(sshDir).catch(() => undefined);
  if (sshDirStats) {
    const mode = sshDirStats.mode & 0o777;
    if (mode !== 0o700) {
      issues.push({
        title: "Wrong Directory Permissions",
        description: `~/.ssh permissions are ${mode.toString(8)}, should be 700.`,
        filePath: sshDir,
        type: "permission",
      });
    }
  }

  for (const key of keys) {
    if (key.storageType !== "file") {
      continue;
    }

    const stats = await fs.stat(key.privateKeyPath).catch(() => undefined);
    if (!stats) {
      continue;
    }

    const mode = stats.mode & 0o777;
    if (mode !== 0o600) {
      issues.push({
        title: "Weak Private Key Permissions",
        description: `${key.name} permissions are ${mode.toString(8)}, should be 600.`,
        filePath: key.privateKeyPath,
        type: "permission",
      });
    }
  }

  const pubFiles = files.filter((file) => file.endsWith(".pub"));
  const excludes = ["known_hosts", "known_hosts.old", "config", "authorized_keys", "authorized_keys2"];

  for (const pubFile of pubFiles) {
    const name = pubFile.replace(".pub", "");
    if (!files.includes(name)) {
      issues.push({
        title: "Orphaned Public Key",
        description: `Public key '${pubFile}' has no corresponding private key file.`,
        filePath: path.join(sshDir, pubFile),
        type: "orphan",
      });
    }
  }

  for (const file of files) {
    if (file.endsWith(".pub") || excludes.includes(file) || file.startsWith(".")) {
      continue;
    }

    const filePath = path.join(sshDir, file);
    const stats = await fs.stat(filePath).catch(() => undefined);
    if (!stats || stats.isDirectory()) {
      continue;
    }

    const content = await fs.readFile(filePath, "utf-8").catch(() => undefined);
    if (!content) {
      continue;
    }

    if (content.trim().startsWith("-----BEGIN")) {
      const pubFile = `${file}.pub`;
      if (!files.includes(pubFile)) {
        issues.push({
          title: "Orphaned Private Key",
          description: `Private key '${file}' has no corresponding public key (.pub) file.`,
          filePath,
          type: "orphan",
        });
      }
    }
  }

  return issues;
}
