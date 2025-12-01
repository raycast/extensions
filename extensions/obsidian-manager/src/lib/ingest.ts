import { getPreferenceValues, environment } from "@raycast/api";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { parseHTML } from "linkedom";
import { Readability } from "@mozilla/readability";
import { readdir, mkdir, writeFile, readFile } from "fs/promises";
import { join, extname, resolve, dirname, basename } from "path";
import { execSync, spawn } from "child_process";
import { existsSync } from "fs";
import { getResearchPrompt, getResearchQueryPrompt, ResearchMode, modeToString } from "./prompts";
import EPub from "epub2";

export type { ResearchMode } from "./prompts";
export { modeToString, stringToMode, getModeDescription } from "./prompts";

interface Preferences {
  vaultPath: string;
  geminiApiKey: string;
  geminiModel: string;
  uvPath?: string;
}

export interface YouTubeTranscription {
  title: string;
  channel: string;
  duration: number;
  transcription: string;
  error?: string;
}

export interface VaultStructure {
  folders: string[];
  notes: NoteInfo[];
}

export interface NoteInfo {
  path: string;
  title: string;
  firstLines: string;
  links: string[];
}

export interface ProcessingResult {
  newNotes: Array<{
    path: string;
    title: string;
    content: string;
  }>;
  updates: Array<{
    path: string;
    addContent: string;
    addLinks: string[];
  }>;
  summary: string;
  reasoning: string;
  uncertainties: string[];
}

export interface IngestedSource {
  id: string;
  type: "url" | "file";
  timestamp: string;
  title?: string;
  mode?: string; // Stores mode as "deep+expert" etc
}

export interface UndoRecord {
  id: string;
  timestamp: string;
  source: string;
  createdFiles: string[];
  modifiedFiles: Array<{
    path: string;
    previousContent: string;
  }>;
}

// Constants
const MAX_CONTENT_LENGTH = 30000;
const MAX_NOTE_PREVIEW_LENGTH = 500;
const MAX_FIRST_LINES = 10;
const MAX_LINKS_PER_NOTE = 10;
const MAX_VAULT_DEPTH = 3;
const TRACKER_FILENAME = ".ingested_sources.json";
const UNDO_FILENAME = ".ingested_undo.json";

export function getConfig(): Preferences {
  return getPreferenceValues<Preferences>();
}

function getGenAI(): GoogleGenerativeAI {
  const { geminiApiKey } = getConfig();
  return new GoogleGenerativeAI(geminiApiKey);
}

export async function getVaultStructure(): Promise<VaultStructure> {
  const { vaultPath } = getConfig();
  const folders: string[] = [];
  const notes: NoteInfo[] = [];

  async function walkDir(dir: string, depth = 0): Promise<void> {
    if (depth > MAX_VAULT_DEPTH) return;

    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.name.startsWith(".")) continue;

        const fullPath = join(dir, entry.name);
        const relativePath = fullPath.replace(vaultPath + "/", "");

        if (entry.isDirectory()) {
          folders.push(relativePath);
          await walkDir(fullPath, depth + 1);
        } else if (entry.name.endsWith(".md")) {
          try {
            const content = await readFile(fullPath, "utf-8");
            const lines = content.split("\n").slice(0, MAX_FIRST_LINES).join("\n");
            const links = [...content.matchAll(/\[\[([^\]]+)\]\]/g)]
              .map((m) => m[1])
              .filter((l): l is string => l !== undefined);

            notes.push({
              path: relativePath,
              title: entry.name.replace(".md", ""),
              firstLines: lines.slice(0, MAX_NOTE_PREVIEW_LENGTH),
              links: links.slice(0, MAX_LINKS_PER_NOTE),
            });
          } catch {
            // Skip unreadable files
          }
        }
      }
    } catch {
      // Directory might not exist or be readable
    }
  }

  if (existsSync(vaultPath)) {
    await walkDir(vaultPath);
  }

  return { folders, notes };
}

export async function extractUrlContent(url: string): Promise<{ content: string; title: string }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
  }
  const html = await response.text();

  const { document } = parseHTML(html);

  // Set the base URL for relative links
  const baseEl = document.createElement("base");
  baseEl.href = url;
  document.head.appendChild(baseEl);

  const reader = new Readability(document as unknown as Document);
  const article = reader.parse();

  if (!article) {
    throw new Error("Readability failed to parse the article");
  }

  return {
    content: article.textContent ? article.textContent.trim() : "",
    title: article.title || "Web Article",
  };
}

export async function extractDocumentContent(filePath: string): Promise<string> {
  const ext = extname(filePath).toLowerCase();

  if (ext === ".pdf") {
    try {
      const result = execSync(`pdftotext -layout "${filePath}" -`, { encoding: "utf-8" });
      return result || "[Could not extract PDF content]";
    } catch {
      return "[Error running pdftotext - make sure it is installed via brew install poppler]";
    }
  }

  if (ext === ".docx") {
    try {
      const result = execSync(`pandoc -f docx -t plain "${filePath}"`, { encoding: "utf-8" });
      return result || "[Could not extract DOCX content]";
    } catch {
      return "[Error running pandoc - make sure it is installed via brew install pandoc]";
    }
  }

  // Plain text, markdown, etc.
  return await readFile(filePath, "utf-8");
}

export async function processDocument(
  documentContent: string,
  documentName: string,
  vault: VaultStructure,
  researchMode: ResearchMode = {},
): Promise<ProcessingResult> {
  const { geminiModel } = getConfig();
  const genAI = getGenAI();

  const vaultContext = `
## Vault Structure

### Folders:
${vault.folders.map((f) => `- ${f}`).join("\n") || "- (no folders yet)"}

### Existing Notes:
${
  vault.notes
    .map(
      (n) => `
**${n.title}** (${n.path})
Links: ${n.links.length > 0 ? n.links.join(", ") : "none"}
Preview: ${n.firstLines.slice(0, 200)}...
`,
    )
    .join("\n---\n") || "(no notes yet)"
}
`;

  const model = genAI.getGenerativeModel({
    model: geminiModel,
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  const researchPrompt = getResearchPrompt(researchMode);

  const prompt = `${researchPrompt}

${vaultContext}

---

## Document to Process

**Source:** ${documentName}

**Content:**
${documentContent.slice(0, MAX_CONTENT_LENGTH)}${documentContent.length > MAX_CONTENT_LENGTH ? "\n\n[Content truncated...]" : ""}

---

Analyze this document and provide a JSON response with:

1. **newNotes**: New note files to create (if the content doesn't fit existing notes well)
2. **updates**: Existing notes that should reference or incorporate this content
3. **summary**: Brief summary of what was extracted and why

Respond ONLY with valid JSON in this exact format:
{
  "newNotes": [
    {
      "path": "folder/Note Title.md",
      "title": "Note Title",
      "content": "Full markdown content with [[wiki links]] to related notes"
    }
  ],
  "updates": [
    {
      "path": "existing/note.md",
      "addContent": "## New Section\\n\\nContent to append...",
      "addLinks": ["New Note Title", "Another Related Note"]
    }
  ],
  "summary": "Brief explanation of processing decisions",
  "reasoning": "Detailed explanation of why you chose these locations and how they fit the vault structure",
  "uncertainties": ["List of any ambiguous information or content you skipped because you weren't sure where it belonged"]
}

Important:
- Do NOT include a title header (# Title) at the start of note content - the filename already serves as the title in Obsidian
- Use [[wiki links]] for cross-references
- Extract key facts and insights per the research mode instructions above
- If creating new folders, include them in the path
- Keep notes focused and atomic when possible`;

  const result = await model.generateContent(prompt);
  let jsonStr = result.response.text().trim();
  jsonStr = jsonStr.replace(/^```(?:json|JSON)?\s*\n/, "").replace(/\n```\s*$/, "");

  return JSON.parse(jsonStr) as ProcessingResult;
}

export interface ResearchQueryResult {
  notes: Array<{
    path: string;
    title: string;
    content: string;
  }>;
  summary: string;
}

export async function performResearchQuery(
  query: string,
  vault: VaultStructure,
  researchMode: ResearchMode = {},
): Promise<ResearchQueryResult> {
  const { geminiModel } = getConfig();
  const genAI = getGenAI();

  const vaultContext = `
## Your Obsidian Vault Structure

### Folders:
${vault.folders.map((f) => `- ${f}`).join("\n") || "- (no folders yet)"}

### Existing Notes (for linking):
${
  vault.notes
    .map((n) => `- ${n.title} (${n.path})`)
    .slice(0, 50)
    .join("\n") || "(no notes yet)"
}
`;

  const model = genAI.getGenerativeModel({
    model: geminiModel,
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  const researchPrompt = getResearchQueryPrompt(researchMode);

  const prompt = `${researchPrompt}

${vaultContext}

---

## Research Query

${query}

---

Research this topic thoroughly and create well-organized notes for the Obsidian vault.

Respond ONLY with valid JSON in this exact format:
{
  "notes": [
    {
      "path": "folder/Note Title.md",
      "title": "Note Title",
      "content": "Full markdown content with [[wiki links]] to related concepts. Include sources, evidence, and analysis."
    }
  ],
  "summary": "Brief summary of what you found and how you organized it"
}

Important:
- Create atomic notes - one main concept per note when possible
- Use [[wiki links]] to connect concepts (including to existing notes in the vault if relevant)
- Do NOT include a title header (# Title) at the start - the filename is the title
- Include sources and citations where possible
- Place notes in appropriate folders based on the vault structure
- If the query relates to existing notes, consider how new notes should link to them`;

  const result = await model.generateContent(prompt);
  let jsonStr = result.response.text().trim();
  jsonStr = jsonStr.replace(/^```(?:json|JSON)?\s*\n/, "").replace(/\n```\s*$/, "");

  return JSON.parse(jsonStr) as ResearchQueryResult;
}

export async function applyResearchNotes(
  result: ResearchQueryResult,
  query: string,
): Promise<{ created: string[]; undo: UndoRecord }> {
  const { vaultPath } = getConfig();
  const created: string[] = [];

  for (const note of result.notes) {
    const fullPath = join(vaultPath, note.path);
    const dir = dirname(fullPath);

    const finalContent = `${note.content}\n\n## Research Query\n> ${query}`;

    await mkdir(dir, { recursive: true });
    await writeFile(fullPath, finalContent, "utf-8");
    created.push(note.path);
  }

  const undo: UndoRecord = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    source: `research:${query.slice(0, 50)}`,
    createdFiles: created,
    modifiedFiles: [],
  };

  return { created, undo };
}

export async function applyChanges(
  result: ProcessingResult,
  sourceInfo: { path: string; name: string; isUrl: boolean },
): Promise<{ created: string[]; updated: string[]; undo: UndoRecord }> {
  const { vaultPath } = getConfig();
  const created: string[] = [];
  const updated: string[] = [];
  const modifiedFiles: Array<{ path: string; previousContent: string }> = [];

  const sourceLink = sourceInfo.isUrl
    ? `[${sourceInfo.name}](${sourceInfo.path})`
    : `[${sourceInfo.name}](file://${resolve(sourceInfo.path)})`;

  // Create new notes
  if (result.newNotes) {
    for (const note of result.newNotes) {
      const fullPath = join(vaultPath, note.path);
      const dir = dirname(fullPath);

      const finalContent = `${note.content}\n\n## Sources\n- ${sourceLink}`;

      await mkdir(dir, { recursive: true });
      await writeFile(fullPath, finalContent, "utf-8");
      created.push(note.path);
    }
  }

  // Apply updates to existing notes
  if (result.updates) {
    for (const update of result.updates) {
      const fullPath = join(vaultPath, update.path);

      if (!existsSync(fullPath)) {
        continue;
      }

      const previousContent = await readFile(fullPath, "utf-8");
      modifiedFiles.push({ path: update.path, previousContent });

      const content = previousContent;

      // Extract existing footer sections
      const relatedMatch = content.match(/^## Related\s*$/m);
      const sourcesMatch = content.match(/^## Sources?\s*$/m);

      let body = content;
      let relatedLines: string[] = [];
      let sourceLines: string[] = [];

      let footerStart = content.length;
      if (relatedMatch && relatedMatch.index !== undefined && relatedMatch.index < footerStart)
        footerStart = relatedMatch.index;
      if (sourcesMatch && sourcesMatch.index !== undefined && sourcesMatch.index < footerStart)
        footerStart = sourcesMatch.index;

      if (footerStart < content.length) {
        body = content.substring(0, footerStart).trim();
        const footer = content.substring(footerStart);

        const relatedSectionMatch = footer.match(/## Related\s*([\s\S]*?)(?=## Sources?|$)/);
        if (relatedSectionMatch && relatedSectionMatch[1]) {
          relatedLines = relatedSectionMatch[1]
            .split("\n")
            .map((l) => l.trim())
            .filter((l) => l.startsWith("-"));
        }

        const sourcesSectionMatch = footer.match(/## Sources?\s*([\s\S]*?)(?=## Related|$)/);
        if (sourcesSectionMatch && sourcesSectionMatch[1]) {
          sourceLines = sourcesSectionMatch[1]
            .split("\n")
            .map((l) => l.trim())
            .filter((l) => l.startsWith("-"));
        }
      }

      if (update.addContent) {
        body += `\n\n${update.addContent}`;
      }

      if (update.addLinks) {
        for (const link of update.addLinks) {
          const linkStr = `- [[${link}]]`;
          if (!relatedLines.includes(linkStr)) {
            relatedLines.push(linkStr);
          }
        }
      }

      const newSourceLine = `- ${sourceLink}`;
      if (!sourceLines.includes(newSourceLine)) {
        sourceLines.push(newSourceLine);
      }

      let newContent = body;

      if (relatedLines.length > 0) {
        newContent += `\n\n## Related\n${relatedLines.join("\n")}`;
      }

      if (sourceLines.length > 0) {
        newContent += `\n\n## Sources\n${sourceLines.join("\n")}`;
      }

      await writeFile(fullPath, newContent, "utf-8");
      updated.push(update.path);
    }
  }

  const undo: UndoRecord = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    source: sourceInfo.path,
    createdFiles: created,
    modifiedFiles,
  };

  return { created, updated, undo };
}

// Undo support
export async function loadUndoRecords(): Promise<UndoRecord[]> {
  const { vaultPath } = getConfig();
  const undoPath = join(vaultPath, UNDO_FILENAME);
  try {
    const content = await readFile(undoPath, "utf-8");
    return JSON.parse(content);
  } catch {
    return [];
  }
}

export async function saveUndoRecord(record: UndoRecord): Promise<void> {
  const { vaultPath } = getConfig();
  const records = await loadUndoRecords();

  // Keep only last 20 undo records
  records.unshift(record);
  if (records.length > 20) {
    records.length = 20;
  }

  const undoPath = join(vaultPath, UNDO_FILENAME);
  await writeFile(undoPath, JSON.stringify(records, null, 2), "utf-8");
}

export async function performUndo(recordId: string): Promise<{ deleted: string[]; restored: string[] }> {
  const { vaultPath } = getConfig();
  const records = await loadUndoRecords();
  const record = records.find((r) => r.id === recordId);

  if (!record) {
    throw new Error("Undo record not found");
  }

  const deleted: string[] = [];
  const restored: string[] = [];

  // Delete created files
  for (const filePath of record.createdFiles) {
    const fullPath = join(vaultPath, filePath);
    if (existsSync(fullPath)) {
      const { unlink } = await import("fs/promises");
      await unlink(fullPath);
      deleted.push(filePath);
    }
  }

  // Restore modified files
  for (const { path: filePath, previousContent } of record.modifiedFiles) {
    const fullPath = join(vaultPath, filePath);
    await writeFile(fullPath, previousContent, "utf-8");
    restored.push(filePath);
  }

  // Remove this undo record
  const updatedRecords = records.filter((r) => r.id !== recordId);
  const undoPath = join(vaultPath, UNDO_FILENAME);
  await writeFile(undoPath, JSON.stringify(updatedRecords, null, 2), "utf-8");

  // Also remove from ingested sources
  const sources = await loadIngestedSources();
  const updatedSources = sources.filter((s) => s.id !== record.source);
  const trackerPath = join(vaultPath, TRACKER_FILENAME);
  await writeFile(trackerPath, JSON.stringify(updatedSources, null, 2), "utf-8");

  return { deleted, restored };
}

// Deduplication
export async function loadIngestedSources(): Promise<IngestedSource[]> {
  const { vaultPath } = getConfig();
  const trackerPath = join(vaultPath, TRACKER_FILENAME);
  try {
    const content = await readFile(trackerPath, "utf-8");
    return JSON.parse(content);
  } catch {
    return [];
  }
}

export async function saveIngestedSource(source: IngestedSource): Promise<void> {
  const { vaultPath } = getConfig();
  const sources = await loadIngestedSources();

  const existingIndex = sources.findIndex((s) => s.id === source.id);
  if (existingIndex >= 0) {
    sources[existingIndex] = source;
  } else {
    sources.push(source);
  }

  const trackerPath = join(vaultPath, TRACKER_FILENAME);
  await writeFile(trackerPath, JSON.stringify(sources, null, 2), "utf-8");
}

export function isSourceIngested(sources: IngestedSource[], id: string, mode?: ResearchMode): IngestedSource | null {
  const existing = sources.find((s) => s.id === id);
  if (!existing) return null;

  // If no mode specified, return existing regardless of mode
  if (!mode) return existing;

  // If mode specified, check if same mode was used
  const requestedMode = modeToString(mode);
  if (existing.mode === requestedMode) {
    return existing;
  }

  // Different mode requested - return null to allow re-ingestion
  return null;
}

export function isUrl(input: string): boolean {
  return input.startsWith("http://") || input.startsWith("https://");
}

export function isYouTubeUrl(url: string): boolean {
  return /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//.test(url);
}

export function isEpubFile(filePath: string): boolean {
  return extname(filePath).toLowerCase() === ".epub";
}

// EPUB Types
export interface EpubChapter {
  id: string;
  title: string;
  order: number;
  preview: string;
  content?: string;
}

export interface EpubInfo {
  title: string;
  author: string;
  chapters: EpubChapter[];
}

function stripHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export async function extractEpubChapters(filePath: string): Promise<EpubInfo> {
  const epub = await EPub.createAsync(filePath);

  const chapters: EpubChapter[] = [];

  // Get chapter list from table of contents or spine
  const toc = epub.toc || [];
  const flow = epub.flow || [];

  // Build a map of id -> toc entry for titles
  const tocMap = new Map<string, string>();
  for (const item of toc) {
    if (item.id && item.title) {
      tocMap.set(item.id, item.title);
    }
  }

  // Process each chapter in reading order
  for (let i = 0; i < flow.length; i++) {
    const item = flow[i];
    if (!item.id) continue;

    try {
      const chapterHtml = await epub.getChapterAsync(item.id);
      if (!chapterHtml) continue;

      const text = stripHtml(chapterHtml);
      if (text.length < 100) continue; // Skip very short chapters (likely title pages, etc.)

      const title = tocMap.get(item.id) || item.title || `Chapter ${i + 1}`;

      chapters.push({
        id: item.id,
        title,
        order: i,
        preview: text.slice(0, 500),
        content: text,
      });
    } catch {
      // Skip unreadable chapters
    }
  }

  return {
    chapters,
    title: epub.metadata?.title || basename(filePath, ".epub"),
    author: epub.metadata?.creator || "Unknown",
  };
}

export async function selectRelevantChapters(
  chapters: EpubChapter[],
  bookTitle: string,
  bookAuthor: string,
): Promise<{ selectedChapters: EpubChapter[]; reasoning: string }> {
  const { geminiModel } = getConfig();
  const genAI = getGenAI();

  const model = genAI.getGenerativeModel({
    model: geminiModel,
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  // Build chapter summary for AI
  const chapterList = chapters
    .map(
      (ch, i) => `
${i + 1}. "${ch.title}"
   Preview: ${ch.preview.slice(0, 300)}...
`,
    )
    .join("\n");

  const prompt = `You are helping select relevant chapters from a book to ingest into a research vault.

**Book:** ${bookTitle}
**Author:** ${bookAuthor}
**Total Chapters:** ${chapters.length}

## Chapter List with Previews:
${chapterList}

---

Analyze these chapters and identify which ones contain substantive content worth extracting.

Skip:
- Front matter (title pages, copyright, dedications)
- Table of contents
- Bibliographies and indexes
- Very short chapters with no real content
- Appendices (unless they contain valuable reference material)

Include:
- Main content chapters
- Introductions that provide context
- Conclusions with key takeaways

Respond with a JSON object listing the chapter numbers (1-indexed) that should be ingested:

{
  "selectedChapters": [1, 3, 5],
  "reasoning": "Brief explanation of why these chapters were selected and others skipped"
}`;

  const result = await model.generateContent(prompt);
  let jsonStr = result.response.text().trim();
  jsonStr = jsonStr.replace(/^```(?:json|JSON)?\s*\n/, "").replace(/\n```\s*$/, "");

  try {
    const selection = JSON.parse(jsonStr) as { selectedChapters: number[]; reasoning: string };

    // Return only selected chapters (convert 1-indexed to 0-indexed)
    const selectedChapters = selection.selectedChapters
      .map((num) => chapters[num - 1])
      .filter((ch): ch is EpubChapter => ch !== undefined);

    return { selectedChapters, reasoning: selection.reasoning };
  } catch {
    // If parsing fails, return all chapters
    return { selectedChapters: chapters, reasoning: "Could not parse AI selection, including all chapters" };
  }
}

export async function transcribeYouTube(
  url: string,
  onProgress?: (message: string) => void,
): Promise<YouTubeTranscription> {
  const { uvPath } = getConfig();
  const uv = uvPath || "uv";

  // Get the path to the transcribe.py script bundled with the extension
  const scriptPath = join(environment.assetsPath, "..", "src", "scripts", "transcribe.py");

  // Check if script exists
  if (!existsSync(scriptPath)) {
    throw new Error(`Transcription script not found at ${scriptPath}`);
  }

  onProgress?.("Starting transcription...");

  return new Promise((resolve, reject) => {
    const proc = spawn(uv, ["run", scriptPath, url], {
      env: { ...process.env, PATH: process.env.PATH + ":/opt/homebrew/bin:/usr/local/bin" },
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      const line = data.toString().trim();
      if (line) {
        stderr += line + "\n";
        onProgress?.(line);
      }
    });

    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Transcription failed: ${stderr || `exit code ${code}`}`));
        return;
      }

      try {
        const result = JSON.parse(stdout) as YouTubeTranscription;
        if (result.error) {
          reject(new Error(result.error));
          return;
        }
        resolve(result);
      } catch {
        reject(new Error(`Failed to parse transcription output: ${stdout.slice(0, 200)}`));
      }
    });

    proc.on("error", (err) => {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        reject(
          new Error(
            `'uv' not found. Install it with: curl -LsSf https://astral.sh/uv/install.sh | sh\n\nOr set the path in extension preferences.`,
          ),
        );
      } else {
        reject(err);
      }
    });
  });
}
