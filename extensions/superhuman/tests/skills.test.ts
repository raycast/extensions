import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..");
const SKILLS_DIR = join(ROOT, "skills");
const PACKAGE_JSON = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));

// Mirror of the tool names declared in `src/lib/readonly.ts` WRITE_TOOLS plus
// the read tools, in snake_case (the form skills use to reference MCP tools).
const VALID_MCP_TOOLS = new Set([
  "create_or_update_draft",
  "send_draft",
  "discard_draft",
  "undo_send",
  "get_thread",
  "get_message",
  "list_threads",
  "list_labels",
  "list_splits",
  "get_attachment",
  "get_read_status_feed",
  "mark_spam",
  "trash_thread",
  "unsubscribe",
  "update_thread",
  "update_personalization",
  "create_or_update_event",
  "get_availability",
  "query_email_and_calendar",
]);

function listSkillDirs(): string[] {
  return readdirSync(SKILLS_DIR).filter((entry) => {
    try {
      return statSync(join(SKILLS_DIR, entry)).isDirectory();
    } catch {
      return false;
    }
  });
}

function parseFrontmatter(raw: string): Record<string, unknown> {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error("missing frontmatter");
  const yaml = match[1];
  const fm: Record<string, unknown> = {};
  let currentList: string[] | null = null;
  for (const line of yaml.split(/\r?\n/)) {
    if (line.match(/^\s*-\s+/) && currentList) {
      currentList.push(line.replace(/^\s*-\s+/, "").trim());
      continue;
    }
    const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!kv) continue;
    const [, key, value] = kv;
    const v = value.trim();
    currentList = null;
    if (v === "") {
      currentList = [];
      fm[key] = currentList;
    } else if (v === "true" || v === "false") fm[key] = v === "true";
    else fm[key] = v.replace(/^["']|["']$/g, "");
  }
  return fm;
}

describe("skills", () => {
  const dirs = listSkillDirs();

  it("at least one skill is bundled", () => {
    expect(dirs.length).toBeGreaterThan(0);
  });

  for (const name of dirs) {
    describe(name, () => {
      const path = join(SKILLS_DIR, name, "SKILL.md");
      const raw = readFileSync(path, "utf8");
      const fm = parseFrontmatter(raw);

      it("has the required frontmatter fields", () => {
        expect(fm.name, "name").toBe(name);
        expect(typeof fm.description).toBe("string");
        expect((fm.description as string).length).toBeGreaterThan(0);
        expect(Array.isArray(fm.tools_used)).toBe(true);
        expect(typeof fm.read_only).toBe("boolean");
      });

      it("every tool in tools_used is a real MCP tool name", () => {
        for (const tool of fm.tools_used as string[]) {
          expect(VALID_MCP_TOOLS.has(tool), `${tool} should be a real MCP tool`).toBe(true);
        }
      });

      it("has a matching Raycast command in package.json", () => {
        const commandName = `skill-${name}`;
        const commands = (PACKAGE_JSON.commands ?? []) as Array<{ name: string }>;
        const found = commands.find((c) => c.name === commandName);
        expect(found, `package.json should declare command ${commandName}`).toBeTruthy();
      });
    });
  }
});
