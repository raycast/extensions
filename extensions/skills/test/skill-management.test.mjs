import assert from "node:assert/strict";
import { test } from "node:test";

import { parseSkillLock, requireCliManagedSkill } from "../src/utils/skill-lock.ts";

test("blocks CLI mutation of a discovered skill without a lock entry", () => {
  const lock = { "find-skills": { source: "example/skills" } };
  assert.doesNotThrow(() => requireCliManagedSkill("find-skills", lock));
  assert.throws(() => requireCliManagedSkill("personal-skill", lock), /not managed by the Skills CLI/);
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
  assert.throws(() => requireCliManagedSkill("malformed", lock), /not managed/);
  assert.deepEqual(parseSkillLock(JSON.stringify({ skills: [] })), {});
});
