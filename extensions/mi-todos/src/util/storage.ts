import fs from "fs";
import path from "path";
import os from "os";

// ─── MiToDos — home is ~/MiToDos/ ───
//
// ~/MiToDos/
//   inbox.md              ← default quick-capture target
//   <project>.md          ← project-scoped files

export function expandHome(filepath: string): string {
  if (filepath.startsWith("~")) {
    return path.join(os.homedir(), filepath.slice(1));
  }
  return filepath;
}

export function resolvePath(base: string): string {
  return path.resolve(expandHome(base));
}

export function ensureDir(dirPath: string): void {
  const resolved = resolvePath(dirPath);
  if (!fs.existsSync(resolved)) {
    fs.mkdirSync(resolved, { recursive: true });
  }
}

export function fileExists(filepath: string): boolean {
  return fs.existsSync(resolvePath(filepath));
}

export function readFile(filepath: string): string {
  return fs.readFileSync(resolvePath(filepath), "utf-8");
}

export function writeFile(filepath: string, content: string): void {
  const resolved = resolvePath(filepath);
  ensureDir(path.dirname(resolved));
  fs.writeFileSync(resolved, content, "utf-8");
}

export function appendFile(filepath: string, content: string): void {
  const resolved = resolvePath(filepath);
  ensureDir(path.dirname(resolved));
  fs.appendFileSync(resolved, content, "utf-8");
}

export function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

const INBOX_HEADING = "## 📋 Inbox";
const TASKS_HEADING = "## 📁 Tasks";

const INBOX_TEMPLATE = `# MiToDos — Inbox

> Quick capture. Sort later.

${INBOX_HEADING}

`;

const PROJECT_TEMPLATE = `# MiToDos — {{name}}

> Created {{date}}

${INBOX_HEADING}

${TASKS_HEADING}

### 🔴 Priority

### 🟡 Medium

### 🟢 Low

## 📊 Notes
`;

export function appendToInbox(mitodosDir: string, task: string): string {
  const inboxPath = path.join(resolvePath(mitodosDir), "inbox.md");

  if (!fs.existsSync(inboxPath)) {
    writeFile(inboxPath, INBOX_TEMPLATE);
  }

  const content = readFile(inboxPath);
  const taskLine = `- [ ] ${task}\n`;

  if (content.includes(INBOX_HEADING)) {
    const lines = content.split("\n");
    const inboxIndex = lines.findIndex((l) => l.trim() === INBOX_HEADING);

    let insertIndex = inboxIndex + 1;
    while (insertIndex < lines.length && lines[insertIndex].startsWith("- [")) {
      insertIndex++;
    }

    lines.splice(insertIndex, 0, taskLine.trimEnd());
    writeFile(inboxPath, lines.join("\n"));
  } else {
    appendFile(inboxPath, `\n${INBOX_HEADING}\n${taskLine}`);
  }

  return task;
}

export function createProjectFile(mitodosDir: string, projectName: string): string {
  const dir = resolvePath(mitodosDir);
  ensureDir(dir);

  const filename = `${projectName.toLowerCase().replace(/\s+/g, "-")}.md`;
  const filepath = path.join(dir, filename);

  if (fs.existsSync(filepath)) {
    throw new Error(`Already exists: ${filename}`);
  }

  const content = PROJECT_TEMPLATE.replace("{{name}}", projectName).replace("{{date}}", todayDate());
  writeFile(filepath, content);

  return filepath;
}

export function listProjectFiles(mitodosDir: string): string[] {
  const dir = resolvePath(mitodosDir);
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(".md", ""));
}
