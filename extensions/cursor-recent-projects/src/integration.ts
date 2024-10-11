import fs from "fs/promises";
import path from "path";
import { showHUD } from "@raycast/api";

// Ensure that the .cursorrules file exists in the project directory
export async function ensureCursorRulesFile(projectPath: string): Promise<void> {
  const cursorRulesPath = path.join(projectPath, ".cursorrules");
  try {
    await fs.access(cursorRulesPath);
  } catch {
    await fs.writeFile(cursorRulesPath, "");
  }
}

// Apply a cursor rule to the project, integrating with escwxyz/cursor-directory
export async function applyCursorRule(projectPath: string, ruleContent: string, replace: boolean): Promise<void> {
  const cursorRulesPath = path.join(projectPath, ".cursorrules");

  if (replace) {
    await fs.writeFile(cursorRulesPath, ruleContent);
  } else {
    await fs.appendFile(cursorRulesPath, "\n" + ruleContent);
  }

  await showHUD("Cursor rules applied successfully");
}
