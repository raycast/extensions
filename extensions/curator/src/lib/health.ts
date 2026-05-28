import { basename, join } from "node:path";
import type { HealthIssue, ParsedSkill, Surface } from "./types";

const USER_SOURCES = new Set<string>(["claude-user", "codex-user"]);

function surfaceDir(home: string, surface: Surface, name: string): string {
  const root = surface === "claude" ? ".claude" : ".codex";
  return join(home, root, "skills", name);
}

function perSkillIssues(s: ParsedSkill): HealthIssue[] {
  // H1: broken symlink
  if (s.isSymlink && s.isBroken) {
    return [
      {
        id: `H1:${s.id}`,
        check: "H1",
        severity: "error",
        skillName: s.name,
        message: "Broken symlink → target missing",
        affectedPaths: [s.entryPath],
        meta: { entryPath: s.entryPath },
      },
    ];
  }
  // H2: missing SKILL.md
  if (!s.skillMdExists) {
    return [
      {
        id: `H2:${s.id}`,
        check: "H2",
        severity: "error",
        skillName: s.name,
        message: "SKILL.md missing",
        affectedPaths: [s.realPath],
        meta: { realPath: s.realPath },
      },
    ];
  }
  const out: HealthIssue[] = [];
  // H2: unparseable
  if (s.parseError) {
    out.push({
      id: `H2:${s.id}`,
      check: "H2",
      severity: "error",
      skillName: s.name,
      message: `SKILL.md unparseable: ${s.parseError}`,
      affectedPaths: [s.realPath],
      meta: { realPath: s.realPath },
    });
  }
  // H3: name != dir
  const fmName =
    typeof s.frontmatter.name === "string" ? s.frontmatter.name.trim() : "";
  const dir = basename(s.realPath);
  if (fmName && fmName !== dir) {
    out.push({
      id: `H3:${s.id}`,
      check: "H3",
      severity: "warning",
      skillName: s.name,
      message: `frontmatter.name '${fmName}' ≠ directory '${dir}'`,
      affectedPaths: [s.realPath],
      meta: { realPath: s.realPath, expectedName: fmName, currentDir: dir },
    });
  }
  return out;
}

function crossSurfaceDrift(
  userSkills: ParsedSkill[],
  home: string,
): HealthIssue[] {
  const hasClaude = userSkills.some((s) => s.surface === "claude");
  const hasCodex = userSkills.some((s) => s.surface === "codex");
  const byName = new Map<string, ParsedSkill[]>();
  for (const s of userSkills) {
    const arr = byName.get(s.name) ?? [];
    arr.push(s);
    byName.set(s.name, arr);
  }
  const out: HealthIssue[] = [];
  for (const [name, list] of byName) {
    const clPaths = new Set(
      list.filter((s) => s.surface === "claude").map((s) => s.realPath),
    );
    const cxPaths = new Set(
      list.filter((s) => s.surface === "codex").map((s) => s.realPath),
    );
    if (clPaths.size && cxPaths.size) {
      const same =
        [...clPaths].every((p) => cxPaths.has(p)) &&
        [...cxPaths].every((p) => clPaths.has(p));
      if (!same) {
        out.push({
          id: `H4d:${name}`,
          check: "H4",
          severity: "warning",
          skillName: name,
          message: "Claude/Codex point to different sources",
          affectedPaths: [...clPaths, ...cxPaths],
          meta: {
            claudePath: [...clPaths][0] ?? "",
            codexPath: [...cxPaths][0] ?? "",
          },
        });
      }
    } else if (clPaths.size && !cxPaths.size && hasCodex) {
      out.push({
        id: `H4m:${name}`,
        check: "H4",
        severity: "warning",
        skillName: name,
        message: "Only in Claude, missing in Codex",
        affectedPaths: [...clPaths],
        meta: {
          realPath: [...clPaths][0] ?? "",
          targetSurface: "codex",
          targetDir: surfaceDir(home, "codex", name),
        },
      });
    } else if (cxPaths.size && !clPaths.size && hasClaude) {
      out.push({
        id: `H4m:${name}`,
        check: "H4",
        severity: "warning",
        skillName: name,
        message: "Only in Codex, missing in Claude",
        affectedPaths: [...cxPaths],
        meta: {
          realPath: [...cxPaths][0] ?? "",
          targetSurface: "claude",
          targetDir: surfaceDir(home, "claude", name),
        },
      });
    }
  }
  return out;
}

function staleCache(skills: ParsedSkill[]): HealthIssue[] {
  const cacheSkills = skills.filter(
    (s) =>
      s.source === "claude-plugin-cache" || s.source === "codex-plugin-cache",
  );
  const byKey = new Map<string, ParsedSkill[]>();
  for (const s of cacheSkills) {
    const k = `${s.marketplace ?? ""}:${s.name}`;
    const arr = byKey.get(k) ?? [];
    arr.push(s);
    byKey.set(k, arr);
  }
  const out: HealthIssue[] = [];
  for (const [key, list] of byKey) {
    if (list.length > 1) {
      const sorted = [...list].sort((a, b) =>
        (b.pluginVersion ?? "").localeCompare(a.pluginVersion ?? ""),
      );
      const old = sorted.slice(1);
      out.push({
        id: `H5:${key}`,
        check: "H5",
        severity: "info",
        skillName: sorted[0].name,
        message: `Stale cache: ${old.length} old version(s)`,
        affectedPaths: old.map((s) => s.realPath),
        meta: { paths: old.map((s) => s.realPath).join("\n") },
      });
    }
  }
  return out;
}

export function computeHealth(
  skills: ParsedSkill[],
  home: string,
): HealthIssue[] {
  const issues: HealthIssue[] = [];
  for (const s of skills) issues.push(...perSkillIssues(s));
  const userSkills = skills.filter(
    (s) => USER_SOURCES.has(s.source) && !s.isBroken,
  );
  issues.push(...crossSurfaceDrift(userSkills, home));
  issues.push(...staleCache(skills));
  return issues;
}
