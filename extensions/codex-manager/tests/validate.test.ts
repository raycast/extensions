import { describe, expect, it } from "vitest";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { validateConfigDoc, validateMcpServer, validateSkillName, validateSkills, validateSkillsFolder } from "@/lib/validate";
import type { Skill } from "@/types";

describe("validateMcpServer", () => {
  it("returns errors for missing command", () => {
    const errors = validateMcpServer("playwright", {});
    expect(errors).toContain("Command is required.");
  });

  it("accepts valid server", () => {
    const errors = validateMcpServer("playwright", { command: "npx", args: ["@playwright/mcp@latest"] });
    expect(errors).toHaveLength(0);
  });
});

describe("validateSkillName", () => {
  it("rejects invalid names", () => {
    expect(validateSkillName("Bad Name")).toBeTruthy();
  });

  it("accepts valid names", () => {
    expect(validateSkillName("my-skill")).toBeNull();
  });
});

describe("validateConfigDoc", () => {
  it("returns error when MCP block is missing", () => {
    const errors = validateConfigDoc({ model: "gpt-5" });
    expect(errors).toContain("No MCP block found.");
  });

  it("returns MCP server validation errors", () => {
    const errors = validateConfigDoc({ mcp_servers: { alpha: { args: ["x"] } } });
    expect(errors.some((error) => error.includes("alpha: Command is required."))).toBe(true);
  });
});

describe("validateSkills", () => {
  it("detects missing SKILL.md and duplicates", () => {
    const skills: Skill[] = [
      { name: "alpha", path: "/tmp/alpha", hasSkillFile: false },
      { name: "Alpha", path: "/tmp/Alpha", hasSkillFile: true }
    ];
    const errors = validateSkills(skills);
    expect(errors.some((error) => error.includes("Missing SKILL.md"))).toBe(true);
    expect(errors.some((error) => error.includes("Duplicate skill name"))).toBe(true);
  });
});

describe("validateSkillsFolder", () => {
  it("returns error for missing folder", async () => {
    const errors = await validateSkillsFolder("/tmp/does-not-exist-codex");
    expect(errors[0]).toContain("Skills folder not found");
  });

  it("returns empty array for an empty folder", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "codex-skills-"));
    const errors = await validateSkillsFolder(dir);
    expect(errors).toHaveLength(0);
  });
});
