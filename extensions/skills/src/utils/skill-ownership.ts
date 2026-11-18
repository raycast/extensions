import { createHash } from "node:crypto";
import { lstat, readFile, readdir, readlink, realpath } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import type { InstalledSkill, SkillLockEntry } from "../shared";

function gitHash(kind: "blob" | "tree", content: Buffer): Buffer {
  return createHash("sha1").update(`${kind} ${content.length}\0`).update(content).digest();
}

type TreeEntry = { mode: string; name: string } & ({ hashes: Buffer[] } | { children: TreeEntry[] });

// Git checks out `text eol=crlf` files, and all text under core.autocrlf, with CRLF, while the lock hashes the LF blobs.
function withLfLineEndings(content: Buffer): Buffer {
  if (content.includes(0) || !content.includes("\r\n")) return content;
  return Buffer.from(content.toString("latin1").replaceAll("\r\n", "\n"), "latin1");
}

async function readTree(directory: string, convertible: Buffer[][]): Promise<TreeEntry[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const tree: TreeEntry[] = [];
  for (const entry of entries.sort((a, b) =>
    Buffer.compare(
      Buffer.from(a.name + (a.isDirectory() ? "/" : "")),
      Buffer.from(b.name + (b.isDirectory() ? "/" : "")),
    ),
  )) {
    const path = join(directory, entry.name);
    const info = await lstat(path);
    if (info.isDirectory()) {
      tree.push({ mode: "40000", name: entry.name, children: await readTree(path, convertible) });
    } else if (info.isFile()) {
      const content = await readFile(path);
      const lf = withLfLineEndings(content);
      const hashes = [gitHash("blob", content)];
      if (lf !== content) {
        hashes.push(gitHash("blob", lf));
        convertible.push(hashes);
      }
      tree.push({ mode: info.mode & 0o111 ? "100755" : "100644", name: entry.name, hashes });
    } else if (info.isSymbolicLink()) {
      // A copied skill may include an in-package symlink; Git hashes its target text.
      tree.push({ mode: "120000", name: entry.name, hashes: [gitHash("blob", Buffer.from(await readlink(path)))] });
    } else {
      throw new Error("Unsupported skill file type");
    }
  }
  return tree;
}

function gitTreeHash(tree: TreeEntry[], asLf: ReadonlySet<Buffer[]>): Buffer {
  return gitHash(
    "tree",
    Buffer.concat(
      tree.flatMap((entry) => [
        Buffer.from(`${entry.mode} ${entry.name}\0`),
        "children" in entry ? gitTreeHash(entry.children, asLf) : entry.hashes[asLf.has(entry.hashes) ? 1 : 0],
      ]),
    ),
  );
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
    const convertible: Buffer[][] = [];
    const tree = await readTree(canonical, convertible);
    // The lock has one hash for the whole folder, so which files Git converted is found by trying the combinations.
    const readings: Buffer[][][] = [[]];
    // shortcut: past 12 CRLF files only the all-LF reading is tried, compare per-file blob SHAs from the GitHub tree if a bigger mixed folder shows up.
    if (convertible.length > 12) readings.push(convertible);
    else {
      for (let mask = 1; mask < 2 ** convertible.length; mask++) {
        readings.push(convertible.filter((_, bit) => mask & (1 << bit)));
      }
    }
    const expected = lock.skillFolderHash.toLowerCase();
    return readings.some((asLf) => gitTreeHash(tree, new Set(asLf)).toString("hex") === expected);
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
