import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const COMMANDS_DIR = join(__dirname, "../../commands");

function getCommandFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry !== "__tests__") {
        results.push(...getCommandFiles(full));
      }
    } else if (/\.(ts|tsx)$/.test(entry)) {
      results.push(full);
    }
  }
  return results;
}

describe("Static checks: no synchronous CLI or FS usage in commands", () => {
  it("no occurrences of runFlashspace( remain in src/commands", () => {
    const violations: string[] = [];
    for (const file of getCommandFiles(COMMANDS_DIR)) {
      const content = readFileSync(file, "utf-8");
      const lines = content.split("\n");
      lines.forEach((line, idx) => {
        // Allow runFlashspaceAsync but not the synchronous runFlashspace(
        if (/runFlashspace\(/.test(line) && !/runFlashspaceAsync\(/.test(line)) {
          violations.push(`${file}:${idx + 1}: ${line.trim()}`);
        }
      });
    }
    expect(violations, `Sync runFlashspace( found:\n${violations.join("\n")}`).toHaveLength(0);
  });

  it("no existsSync or readFileSync usages remain in src/commands", () => {
    const violations: string[] = [];
    for (const file of getCommandFiles(COMMANDS_DIR)) {
      const content = readFileSync(file, "utf-8");
      const lines = content.split("\n");
      lines.forEach((line, idx) => {
        if (/existsSync|readFileSync/.test(line)) {
          violations.push(`${file}:${idx + 1}: ${line.trim()}`);
        }
      });
    }
    expect(violations, `Sync FS usage found:\n${violations.join("\n")}`).toHaveLength(0);
  });

  it("list-profiles.tsx imports runFlashspaceAsync, getErrorMessage, and showToast", () => {
    const file = `${COMMANDS_DIR}/list-profiles.tsx`;
    const content = readFileSync(file, "utf-8");
    expect(content).toContain("runFlashspaceAsync");
    expect(content).toContain("getErrorMessage");
    expect(content).toContain("showToast");
  });
});
