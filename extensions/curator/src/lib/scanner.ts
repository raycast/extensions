import { readdir, lstat, stat, realpath } from "node:fs/promises";
import { join } from "node:path";
import type { RawSkillEntry, SourceType, Surface } from "./types";

async function exists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function listDirs(p: string): Promise<string[]> {
  try {
    const names = await readdir(p);
    return names.filter((n) => !n.startsWith("."));
  } catch {
    return [];
  }
}

async function inspectEntry(
  entryPath: string,
  surface: Surface,
  source: SourceType,
  extra: Partial<RawSkillEntry>,
): Promise<RawSkillEntry | null> {
  let isSymlink = false;
  let isBroken = false;
  let realPath = entryPath;
  let fileMtime: number | null = null;
  let skillMdExists = false;

  try {
    const ls = await lstat(entryPath);
    isSymlink = ls.isSymbolicLink();
    if (isSymlink) {
      try {
        realPath = await realpath(entryPath);
      } catch {
        isBroken = true;
      }
    }
    if (!isBroken) {
      const st = await stat(realPath);
      if (!st.isDirectory()) return null;
      const md = join(realPath, "SKILL.md");
      skillMdExists = await exists(md);
      try {
        fileMtime = (await stat(skillMdExists ? md : realPath)).mtimeMs;
      } catch {
        fileMtime = null;
      }
    }
  } catch {
    return null;
  }

  return {
    entryPath,
    realPath,
    isSymlink,
    isBroken,
    skillMdExists,
    surface,
    source,
    fileMtime,
    ...extra,
  };
}

async function scanDir(
  dir: string,
  surface: Surface,
  source: SourceType,
  extra: Partial<RawSkillEntry>,
): Promise<RawSkillEntry[]> {
  const out: RawSkillEntry[] = [];
  for (const name of await listDirs(dir)) {
    const e = await inspectEntry(join(dir, name), surface, source, extra);
    // Keep dirs that look like skills (have SKILL.md) or are broken symlinks worth flagging.
    if (e && (e.skillMdExists || e.isBroken)) out.push(e);
  }
  return out;
}

async function scanAgent(
  home: string,
  agent: Surface,
): Promise<RawSkillEntry[]> {
  const root = join(home, agent === "claude" ? ".claude" : ".codex");
  const out: RawSkillEntry[] = [];

  out.push(
    ...(await scanDir(
      join(root, "skills"),
      agent,
      `${agent}-user` as SourceType,
      {},
    )),
  );

  const mpRoot = join(root, "plugins/marketplaces");
  for (const mp of await listDirs(mpRoot)) {
    out.push(
      ...(await scanDir(
        join(mpRoot, mp, "skills"),
        agent,
        `${agent}-plugin-marketplace` as SourceType,
        {
          marketplace: mp,
        },
      )),
    );
    const plugRoot = join(mpRoot, mp, "plugins");
    for (const pl of await listDirs(plugRoot)) {
      out.push(
        ...(await scanDir(
          join(plugRoot, pl, "skills"),
          agent,
          `${agent}-plugin-nested` as SourceType,
          {
            marketplace: mp,
            pluginName: pl,
          },
        )),
      );
    }
  }

  const cacheRoot = join(root, "plugins/cache");
  for (const mp of await listDirs(cacheRoot)) {
    for (const ver of await listDirs(join(cacheRoot, mp))) {
      out.push(
        ...(await scanDir(
          join(cacheRoot, mp, ver, "skills"),
          agent,
          `${agent}-plugin-cache` as SourceType,
          {
            marketplace: mp,
            pluginVersion: ver,
          },
        )),
      );
    }
  }

  return out;
}

export async function scanSkills(home: string): Promise<RawSkillEntry[]> {
  const claude = await scanAgent(home, "claude");
  const codex = await scanAgent(home, "codex");
  return [...claude, ...codex];
}
