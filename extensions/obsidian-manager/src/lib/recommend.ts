import { getPreferenceValues } from "@raycast/api";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { readdir, readFile } from "fs/promises";
import { join, relative } from "path";

interface Preferences {
  vaultPath: string;
  geminiApiKey: string;
  geminiModel: string;
}

export interface Recommendation {
  title: string;
  description: string;
  type: "gap" | "shallow" | "connection" | "question" | "source";
  priority: "high" | "medium" | "low";
  relatedNotes: string[];
  suggestedSources?: string[];
  researchQuery?: string;
}

export interface VaultAnalysis {
  summary: string;
  topicsCovered: string[];
  recommendations: Recommendation[];
}

interface NoteContent {
  path: string;
  relativePath: string;
  content: string;
}

function getConfig(): Preferences {
  return getPreferenceValues<Preferences>();
}

async function walkVault(dir: string, vaultPath: string): Promise<NoteContent[]> {
  const notes: NoteContent[] = [];

  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.startsWith(".") && entry.name !== "node_modules") {
          notes.push(...(await walkVault(fullPath, vaultPath)));
        }
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        const content = await readFile(fullPath, "utf-8");
        notes.push({
          path: fullPath,
          relativePath: relative(vaultPath, fullPath),
          content: content.slice(0, 2000), // First 2000 chars for context
        });
      }
    }
  } catch (e) {
    console.error(`Error reading directory ${dir}:`, e);
  }

  return notes;
}

export async function analyzeVault(): Promise<VaultAnalysis> {
  const { vaultPath, geminiApiKey, geminiModel } = getConfig();
  const genAI = new GoogleGenerativeAI(geminiApiKey);

  const notes = await walkVault(vaultPath, vaultPath);

  // Calculate how much preview we can afford per note
  // Target ~30k chars total for vault summary to stay well under limits
  const TARGET_TOTAL_CHARS = 30000;
  const charsPerNote = Math.max(100, Math.floor(TARGET_TOTAL_CHARS / Math.max(notes.length, 1)));

  // Build a summary of the vault with adaptive preview length
  const vaultSummary = notes
    .map((n) => {
      const preview = n.content.slice(0, charsPerNote).replace(/\n/g, " ");
      return `## ${n.relativePath}\n${preview}`;
    })
    .join("\n\n---\n\n");

  const model = genAI.getGenerativeModel({
    model: geminiModel,
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  const prompt = `You are an expert research advisor analyzing an Obsidian vault to identify gaps, opportunities for deeper research, and missing connections.

**Vault Contents (${notes.length} notes, previews truncated to fit context):**

${vaultSummary.slice(0, 35000)}

---

Analyze this knowledge base and identify:

1. **GAPS**: Important topics that are missing or barely mentioned given the apparent focus of the vault
2. **SHALLOW**: Topics that exist but lack depth - need more detailed notes, evidence, or nuance
3. **CONNECTIONS**: Potential links between topics that aren't being made
4. **QUESTIONS**: Interesting research questions that emerge from the existing content
5. **SOURCES**: Specific types of sources (books, papers, experts, primary sources) that would strengthen the vault

For each recommendation, provide:
- A clear, actionable title
- Why this matters and what value it would add
- Which existing notes relate to this recommendation
- Priority (high/medium/low) based on how central it is to the vault's apparent purpose
- For gaps and shallow areas: a research query that could be used to find sources

Respond with JSON:

{
  "summary": "Brief overview of what this vault covers and its apparent focus",
  "topicsCovered": ["Topic 1", "Topic 2", ...],
  "recommendations": [
    {
      "title": "Add notes on X",
      "description": "This is important because...",
      "type": "gap",
      "priority": "high",
      "relatedNotes": ["existing-note.md", "another-note.md"],
      "suggestedSources": ["Type of source to look for"],
      "researchQuery": "A query to find sources on this topic"
    }
  ]
}

Prioritize quality over quantity. Aim for 5-15 high-value recommendations that would genuinely improve the knowledge base.`;

  const result = await model.generateContent(prompt);
  let jsonStr = result.response.text().trim();
  jsonStr = jsonStr.replace(/^```(?:json|JSON)?\s*\n/, "").replace(/\n```\s*$/, "");

  try {
    return JSON.parse(jsonStr) as VaultAnalysis;
  } catch {
    console.error("Failed to parse AI response:", jsonStr);
    return {
      summary: "Failed to analyze vault",
      topicsCovered: [],
      recommendations: [],
    };
  }
}

export async function analyzeSpecificArea(focusArea: string): Promise<VaultAnalysis> {
  const { vaultPath, geminiApiKey, geminiModel } = getConfig();
  const genAI = new GoogleGenerativeAI(geminiApiKey);

  const notes = await walkVault(vaultPath, vaultPath);

  // Calculate how much preview we can afford per note
  const TARGET_TOTAL_CHARS = 30000;
  const charsPerNote = Math.max(100, Math.floor(TARGET_TOTAL_CHARS / Math.max(notes.length, 1)));

  // Build a summary of the vault with adaptive preview length
  const vaultSummary = notes
    .map((n) => {
      const preview = n.content.slice(0, charsPerNote).replace(/\n/g, " ");
      return `## ${n.relativePath}\n${preview}`;
    })
    .join("\n\n---\n\n");

  const model = genAI.getGenerativeModel({
    model: geminiModel,
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  const prompt = `You are an expert research advisor analyzing an Obsidian vault, specifically focused on: "${focusArea}"

**Vault Contents (${notes.length} notes, previews truncated to fit context):**

${vaultSummary.slice(0, 35000)}

---

Focusing specifically on "${focusArea}", identify:

1. **GAPS**: What's missing about ${focusArea} that should be covered?
2. **SHALLOW**: What aspects of ${focusArea} need more depth?
3. **CONNECTIONS**: How does ${focusArea} connect to other topics in the vault?
4. **QUESTIONS**: What research questions about ${focusArea} emerge?
5. **SOURCES**: What sources would strengthen coverage of ${focusArea}?

Respond with JSON:

{
  "summary": "Current state of coverage on ${focusArea}",
  "topicsCovered": ["Subtopic 1", "Subtopic 2", ...],
  "recommendations": [
    {
      "title": "Add notes on X",
      "description": "This is important because...",
      "type": "gap",
      "priority": "high",
      "relatedNotes": ["existing-note.md"],
      "suggestedSources": ["Type of source"],
      "researchQuery": "Query to find sources"
    }
  ]
}

Focus on actionable, specific recommendations for "${focusArea}".`;

  const result = await model.generateContent(prompt);
  let jsonStr = result.response.text().trim();
  jsonStr = jsonStr.replace(/^```(?:json|JSON)?\s*\n/, "").replace(/\n```\s*$/, "");

  try {
    return JSON.parse(jsonStr) as VaultAnalysis;
  } catch {
    console.error("Failed to parse AI response:", jsonStr);
    return {
      summary: "Failed to analyze vault",
      topicsCovered: [],
      recommendations: [],
    };
  }
}
