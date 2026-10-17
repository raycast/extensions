import fs from "fs/promises";
import path from "path";
import { showHUD } from "@raycast/api";
import { KiroDirectoryContext } from "./types";

// Ensure that the .kirorules file exists in the project directory
async function ensureKiroRulesFile(projectPath: string): Promise<void> {
  const kiroRulesPath = path.join(projectPath, ".kirorules");
  try {
    await fs.access(kiroRulesPath);
  } catch {
    await fs.writeFile(kiroRulesPath, "");
  }
}

// Apply a kiro rule to the project, integrating with escwxyz/kiro-directory
async function applyKiroRule(projectPath: string, ruleContent: string, replace: boolean): Promise<void> {
  const kiroRulesPath = path.join(projectPath, ".kirorules");

  if (replace) {
    await fs.writeFile(kiroRulesPath, ruleContent);
  } else {
    await fs.appendFile(kiroRulesPath, "\n" + ruleContent);
  }

  await showHUD("Kiro rules applied successfully");
}

export async function run(uri: string, context: KiroDirectoryContext) {
  try {
    const projectDir = uri.split("file://").slice(1).join("/");
    await ensureKiroRulesFile(projectDir);
    await applyKiroRule(projectDir, context.ruleContent, context.replace ?? true);
  } catch (error) {
    console.error("Error applying kiro rules:", error);
    await showHUD("Failed to apply kiro rules");
  }
}
