import { getPreferenceValues } from "@raycast/api";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { readdir, unlink, mkdir, writeFile, readFile } from "fs/promises";
import { join, basename, dirname, relative } from "path";
import { existsSync } from "fs";

interface Preferences {
  vaultPath: string;
  geminiApiKey: string;
  geminiModel: string;
}

export interface Action {
  type: "RENAME" | "REWRITE" | "SPLIT" | "NO_ACTION";
  reason: string;
  newPath?: string;
  content?: string;
  newNotes?: Array<{
    path: string;
    content: string;
  }>;
}

export interface OrganizationPlan {
  actions: Action[];
}

export interface VaultFile {
  path: string;
  relativePath: string;
}

function getConfig(): Preferences {
  return getPreferenceValues<Preferences>();
}

export async function walkVault(): Promise<VaultFile[]> {
  const { vaultPath } = getConfig();
  const files: VaultFile[] = [];

  async function walk(dir: string): Promise<void> {
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          if (!entry.name.startsWith(".") && entry.name !== "node_modules") {
            await walk(fullPath);
          }
        } else if (entry.isFile() && entry.name.endsWith(".md")) {
          files.push({
            path: fullPath,
            relativePath: relative(vaultPath, fullPath),
          });
        }
      }
    } catch (e) {
      console.error(`Error reading directory ${dir}:`, e);
    }
  }

  await walk(vaultPath);
  return files;
}

export async function analyzeNote(filePath: string): Promise<OrganizationPlan> {
  const { geminiApiKey, geminiModel } = getConfig();
  const genAI = new GoogleGenerativeAI(geminiApiKey);

  const content = await readFile(filePath, "utf-8");

  const model = genAI.getGenerativeModel({
    model: geminiModel,
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  const prompt = `You are an expert editor organizing an Obsidian vault.
Analyze this note and determine if it needs reorganization.

**Current File:** ${filePath}
**Content:**
${content.slice(0, 20000)}

Determine the best course of action:
1. **NO_ACTION**: The note is well-named, focused, and structured.
2. **RENAME**: The content is good, but the filename is vague or incorrect.
3. **REWRITE**: The content is messy, unstructured, or needs better formatting, but stays as one note.
4. **SPLIT**: The note contains multiple distinct topics that should be separate atomic notes.

Guidelines:
- Prefer NO_ACTION unless there's a clear problem
- RENAME only if the filename doesn't match the content
- REWRITE for poor formatting, missing headers, or unclear structure
- SPLIT only when a note clearly covers 2+ unrelated topics

Respond with a JSON object containing a list of actions:

{
  "actions": [
    {
      "type": "NO_ACTION",
      "reason": "Note is well-organized"
    }
  ]
}

Or for changes:

{
  "actions": [
    {
      "type": "RENAME",
      "reason": "Current title is too generic",
      "newPath": "Better Title.md"
    }
  ]
}

{
  "actions": [
    {
      "type": "REWRITE",
      "reason": "Adding headers and fixing formatting",
      "content": "Full markdown content..."
    }
  ]
}

{
  "actions": [
    {
      "type": "SPLIT",
      "reason": "Contains two distinct topics",
      "newNotes": [
        { "path": "Topic A.md", "content": "..." },
        { "path": "Topic B.md", "content": "..." }
      ]
    }
  ]
}
`;

  const result = await model.generateContent(prompt);
  let jsonStr = result.response.text().trim();
  jsonStr = jsonStr.replace(/^```(?:json|JSON)?\s*\n/, "").replace(/\n```\s*$/, "");

  try {
    return JSON.parse(jsonStr) as OrganizationPlan;
  } catch {
    console.error("Failed to parse AI response:", jsonStr);
    return { actions: [] };
  }
}

export async function applyOrganization(
  filePath: string,
  plan: OrganizationPlan,
): Promise<{ backup?: string; created: string[]; deleted: string[] }> {
  const dir = dirname(filePath);
  const content = await readFile(filePath, "utf-8");

  const result: { backup?: string; created: string[]; deleted: string[] } = {
    created: [],
    deleted: [],
  };

  for (const action of plan.actions) {
    if (action.type === "RENAME" && action.newPath) {
      const newFullPath = join(dir, action.newPath);

      // Ensure directory exists
      const newDir = dirname(newFullPath);
      if (!existsSync(newDir)) {
        await mkdir(newDir, { recursive: true });
      }

      await writeFile(newFullPath, content, "utf-8");
      await unlink(filePath);

      result.created.push(action.newPath);
      result.deleted.push(basename(filePath));
    } else if (action.type === "REWRITE" && action.content) {
      // Create backup
      const backupPath = filePath + ".backup";
      await writeFile(backupPath, content, "utf-8");
      result.backup = backupPath;

      await writeFile(filePath, action.content, "utf-8");
    } else if (action.type === "SPLIT" && action.newNotes) {
      for (const note of action.newNotes) {
        const notePath = join(dir, note.path);
        const noteDir = dirname(notePath);

        if (!existsSync(noteDir)) {
          await mkdir(noteDir, { recursive: true });
        }

        await writeFile(notePath, note.content, "utf-8");
        result.created.push(note.path);
      }

      // Backup and delete original
      const backupPath = filePath + ".backup";
      await writeFile(backupPath, content, "utf-8");
      result.backup = backupPath;

      await unlink(filePath);
      result.deleted.push(basename(filePath));
    }
  }

  return result;
}
