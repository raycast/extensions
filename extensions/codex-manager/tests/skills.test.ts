import { describe, expect, it } from "vitest";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { createSkill, listSkills, updateSkillMetadata } from "@/lib/skills";

describe("skills", () => {
  it("creates and lists skills", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "codex-skills-"));
    await createSkill(dir, "alpha", { description: "Alpha skill" });
    const skills = await listSkills(dir);
    expect(skills).toHaveLength(1);
    expect(skills[0].name).toBe("alpha");
    expect(skills[0].description).toBe("Alpha skill");
  });

  it("updates skill metadata", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "codex-skills-"));
    const skillPath = await createSkill(dir, "beta", { description: "Beta" });
    await updateSkillMetadata(skillPath, { description: "Updated" });
    const skillFile = path.join(skillPath, "SKILL.md");
    const content = await fs.readFile(skillFile, "utf8");
    expect(content).toContain("description: Updated");
  });
});
