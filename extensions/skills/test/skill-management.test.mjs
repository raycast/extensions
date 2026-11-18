import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { parseSkillLock, skillLockMetadata } from "../src/utils/skill-lock.ts";
import { isVerifiedCliSkill, safeMutableAgents } from "../src/utils/skill-ownership.ts";

test("verifies the canonical skill contents before allowing CLI management", async () => {
  const root = await mkdtemp(join(tmpdir(), "raycast-skill-owner-"));
  const skillsRoot = join(root, "skills");
  const canonical = join(skillsRoot, "demo");
  try {
    await mkdir(canonical, { recursive: true });
    await writeFile(join(canonical, "SKILL.md"), "---\nname: demo\ndescription: Demo skill\n---\n");
    const skill = { name: "demo", path: canonical, agents: ["Codex", "Claude Code"] };
    const lock = {
      source: "example/skills",
      sourceType: "github",
      skillFolderHash: "5bbd7be94e167ee7173b6faca5250de9a36003a2",
    };
    assert.equal(await isVerifiedCliSkill(skill, lock, skillsRoot), true);
    assert.deepEqual(await safeMutableAgents("demo", skill.agents, skillsRoot, join(root, "claude")), [
      "Codex",
      "Claude Code",
    ]);
    await mkdir(join(root, "claude", "skills"), { recursive: true });
    await mkdir(join(root, "claude", "skills", "demo"));
    await writeFile(
      join(root, "claude", "skills", "demo", "SKILL.md"),
      "---\nname: demo\ndescription: Demo skill\n---\n",
    );
    assert.deepEqual(await safeMutableAgents("demo", skill.agents, skillsRoot, join(root, "claude")), ["Codex"]);
    await rm(join(root, "claude", "skills", "demo"), { recursive: true });
    await symlink(canonical, join(root, "claude", "skills", "demo"));
    assert.deepEqual(await safeMutableAgents("demo", skill.agents, skillsRoot, join(root, "claude")), [
      "Codex",
      "Claude Code",
    ]);
    await writeFile(join(canonical, "SKILL.md"), "replaced by a local skill");
    assert.equal(await isVerifiedCliSkill(skill, lock, skillsRoot), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("invalid lock entries cannot authorize skill changes", () => {
  const lock = parseSkillLock(
    JSON.stringify({
      skills: {
        valid: { source: "team/skills", sourceType: "github", skillPath: "skills/valid/SKILL.md" },
        malformed: { source: "team/skills" },
      },
    }),
  );
  assert.deepEqual(Object.keys(lock), ["valid"]);
  assert.equal(lock.malformed, undefined);
  assert.deepEqual(parseSkillLock(JSON.stringify({ skills: [] })), {});
});

test("keeps local lock metadata readable without granting removal permission", () => {
  const lock = {
    source: join(homedir(), "projects", "my-skills"),
    sourceType: "local",
    installedAt: "2026-10-01T00:00:00Z",
    updatedAt: "2026-10-02T00:00:00Z",
  };
  assert.deepEqual(parseSkillLock(JSON.stringify({ skills: { demo: lock } })).demo, lock);
  assert.deepEqual(skillLockMetadata(lock), {
    source: join("~", "projects", "my-skills"),
    sourceType: "local",
    sourceUrl: undefined,
    ref: undefined,
    installedAt: lock.installedAt,
    updatedAt: lock.updatedAt,
  });
});
