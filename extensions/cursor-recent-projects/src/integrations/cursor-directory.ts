import fs from "fs/promises";
import path from "path";
import { showHUD } from "@raycast/api";
import { CursorDirectoryContext } from "./types";

// Ensure that the .cursorrules file exists in the project directory
async function ensureCursorRulesFile(projectPath: string): Promise<void> {
  const cursorRulesPath = path.join(projectPath, ".cursorrules");
  try {
    await fs.access(cursorRulesPath);
  } catch {
    await fs.writeFile(cursorRulesPath, "");
  }
}

// Apply a cursor rule to the project, integrating with escwxyz/cursor-directory
async function applyCursorRule(projectPath: string, ruleContent: string, replace: boolean): Promise<void> {
  const cursorRulesPath = path.join(projectPath, ".cursorrules");

  if (replace) {
    await fs.writeFile(cursorRulesPath, ruleContent);
  } else {
    await fs.appendFile(cursorRulesPath, "\n" + ruleContent);
  }

  await showHUD("Cursor rules applied successfully");
}

export async function run(uri: string, context: CursorDirectoryContext) {
  try {
    const projectDir = uri.split("file://").slice(1).join("/");
    await ensureCursorRulesFile(projectDir);
    await applyCursorRule(projectDir, context.ruleContent, context.replace ?? true);
  } catch (error) {
    console.error("Error applying cursor rules:", error);
    await showHUD("Failed to apply cursor rules");
  }
}
