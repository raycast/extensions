import fs from "fs/promises";
import path from "path";
import os from "os";
import { SSHKey, StorageType } from "../types/ssh";
import { getFingerprint } from "./ssh";

export async function listAgentKeys(): Promise<SSHKey[]> {
  const { execFile } = await import("child_process");
  const { promisify } = await import("util");
  const execFileAsync = promisify(execFile);
  try {
    const { stdout: lOut } = await execFileAsync("ssh-add", ["-l"]);
    const { stdout: LOut } = await execFileAsync("ssh-add", ["-L"]);

    const lLines = lOut.trim().split("\n");
    const LLines = LOut.trim().split("\n");
    const agentKeys: SSHKey[] = [];

    if (lOut.includes("no identities") || lOut.includes("error")) return [];

    for (let i = 0; i < LLines.length; i++) {
      const LLine = LLines[i];
      const lLine = lLines[i] || "";
      if (!LLine || LLine.startsWith("The agent") || LLine.startsWith("error")) continue;

      const partsL = LLine.split(" ");
      const algorithmL = partsL[0] || "unknown";
      const commentL = partsL.slice(2).join(" ") || "";

      const parts_l = lLine.split(" ");
      const fingerprint = parts_l[1] || "";

      agentKeys.push({
        name: commentL || `Agent Key ${i + 1}`,
        privateKeyPath: "",
        publicKeyPath: "",
        publicKeyContent: LLine,
        algorithm: algorithmL,
        fingerprint: fingerprint,
        comment: commentL,
        storageType: "hardware",
        hasPassphrase: false,
        createdAt: new Date(),
      });
    }
    return agentKeys;
  } catch {
    return [];
  }
}

export async function scanSSHDirectory(): Promise<SSHKey[]> {
  const sshDir = path.join(os.homedir(), ".ssh");

  try {
    const files = await fs.readdir(sshDir);
    const pubFiles = files.filter((f) => f.endsWith(".pub"));

    const keys: SSHKey[] = [];

    for (const pubFile of pubFiles) {
      const name = pubFile.replace(".pub", "");
      const pubPath = path.join(sshDir, pubFile);
      const privPath = path.join(sshDir, name);

      let pubContent = "";
      try {
        pubContent = await fs.readFile(pubPath, "utf-8");
      } catch {
        continue;
      }

      const parts = pubContent.trim().split(" ");
      const algorithm = parts[0] || "unknown";
      const comment = parts.slice(2).join(" ") || "";

      let storageType: StorageType = "file";
      if (algorithm.endsWith("-sk")) {
        storageType = "hardware";
      }

      let fingerprint = "";
      try {
        fingerprint = await getFingerprint(pubPath);
        // Fingerprint output is usually: "256 SHA256:xxxxx (ED25519)"
        const fpParts = fingerprint.split(" ");
        if (fpParts[1]) {
          fingerprint = fpParts[1];
        }
      } catch {
        // Fallback or ignore
      }

      let stats;
      try {
        stats = await fs.stat(pubPath);
      } catch {
        stats = { birthtime: new Date() };
      }

      let hasPassphrase = false;
      if (storageType === "file") {
        try {
          const { checkIfKeyHasPassphrase } = await import("./ssh");
          hasPassphrase = await checkIfKeyHasPassphrase(privPath);
        } catch {
          // Ignore
        }
      }

      keys.push({
        name,
        privateKeyPath: privPath,
        publicKeyPath: pubPath,
        publicKeyContent: pubContent,
        algorithm,
        fingerprint,
        comment,
        storageType,
        hasPassphrase,
        createdAt: stats.birthtime,
      });
    }

    try {
      const agentKeys = await listAgentKeys();
      for (const ak of agentKeys) {
        const hasMatchingFingerprint = Boolean(
          ak.fingerprint && keys.some((k) => k.fingerprint && k.fingerprint === ak.fingerprint),
        );
        const hasMatchingPublicKey = keys.some(
          (k) => k.publicKeyContent && ak.publicKeyContent && k.publicKeyContent.trim() === ak.publicKeyContent.trim(),
        );

        if (!hasMatchingFingerprint && !hasMatchingPublicKey) {
          keys.push(ak);
        }
      }
    } catch {
      return keys;
    }

    return keys;
  } catch (error) {
    if ((error as Error & { code?: string }).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}
