import { createHash } from "node:crypto";
import { lstat, readFile, readdir, readlink, realpath } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import type { InstalledSkill, SkillLockEntry } from "../shared";

function gitHash(kind: "blob" | "tree", content: Buffer): Buffer {
  return createHash("sha1").update(`${kind} ${content.length}\0`).update(content).digest();
}

async function gitTreeHash(directory: string): Promise<string> {
  const entries = await readdir(directory, { withFileTypes: true });
  const parts: Buffer[] = [];
  for (const entry of entries.sort((a, b) =>
    Buffer.compare(
      Buffer.from(a.name + (a.isDirectory() ? "/" : "")),
      Buffer.from(b.name + (b.isDirectory() ? "/" : "")),
    ),
  )) {
    const path = join(directory, entry.name);
    const info = await lstat(path);
    let mode: string;
    let hash: Buffer;
    if (info.isDirectory()) {
      mode = "40000";
      hash = Buffer.from(await gitTreeHash(path), "hex");
    } else if (info.isFile()) {
      mode = info.mode & 0o111 ? "100755" : "100644";
      hash = gitHash("blob", await readFile(path));
    } else if (info.isSymbolicLink()) {
      // A copied skill may include an in-package symlink; Git hashes its target text.
      mode = "120000";
      hash = gitHash("blob", Buffer.from(await readlink(path)));
    } else {
      throw new Error("Unsupported skill file type");
    }
    parts.push(Buffer.from(`${mode} ${entry.name}\0`), hash);
  }
  return gitHash("tree", Buffer.concat(parts)).toString("hex");
}

export function canonicalSkillPath(name: string, skillsRoot = join(homedir(), ".agents", "skills")): string {
  return join(skillsRoot, name);
}

export async function isVerifiedCliSkill(
  skill: InstalledSkill,
  lock: SkillLockEntry | undefined,
  skillsRoot?: string,
): Promise<boolean> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(skill.name)) return false;
  if (lock?.sourceType !== "github" || !/^[a-f0-9]{40}$/i.test(lock.skillFolderHash ?? "")) return false;
  const canonical = canonicalSkillPath(skill.name, skillsRoot);
  if (resolve(skill.path) !== canonical) return false;
  try {
    if (!(await lstat(canonical)).isDirectory()) return false;
    return (await gitTreeHash(canonical)) === lock.skillFolderHash.toLowerCase();
  } catch {
    return false;
  }
}

export async function safeMutableAgents(
  name: string,
  agents: string[],
  skillsRoot?: string,
  claudeRoot = process.env.CLAUDE_CONFIG_DIR?.trim() || join(homedir(), ".claude"),
): Promise<string[]> {
  const canonical = canonicalSkillPath(name, skillsRoot);
  const safe: string[] = [];
  for (const agent of agents) {
    if (agent === "Codex") {
      safe.push(agent);
    } else if (agent === "Claude Code") {
      const native = join(claudeRoot, "skills", name);
      try {
        const info = await lstat(native);
        if (info.isSymbolicLink() && (await realpath(native)) === (await realpath(canonical))) safe.push(agent);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") safe.push(agent);
      }
    }
  }
  return safe;
}
