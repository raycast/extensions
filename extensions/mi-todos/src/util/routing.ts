import path from "path";
import { resolvePath, readFile, writeFile, appendFile, fileExists, todayDate } from "./storage";

const INBOX_HEADING = "## 📋 Inbox";

const PROJECT_FILE_TEMPLATE = `# MiToDos — {{name}}

> Created {{date}}

${INBOX_HEADING}

## 📁 Tasks

### 🔴 Priority

### 🟡 Medium

### 🟢 Low

## 📊 Notes
`;

/**
 * Append a task to a project file's inbox section.
 * Creates the file with a template if it doesn't exist.
 */
export function appendToProject(mitodosDir: string, projectName: string, task: string): string {
  const dir = resolvePath(mitodosDir);
  const filepath = path.join(dir, `${projectName}.md`);

  if (!fileExists(filepath)) {
    const content = PROJECT_FILE_TEMPLATE.replace("{{name}}", projectName).replace(
      "{{date}}",
      todayDate(),
    );
    writeFile(filepath, content);
  }

  const content = readFile(filepath);
  const taskLine = `- [ ] ${task}\n`;

  if (content.includes(INBOX_HEADING)) {
    const lines = content.split("\n");
    const inboxIndex = lines.findIndex((l) => l.trim() === INBOX_HEADING);
    let insertIndex = inboxIndex + 1;
    while (insertIndex < lines.length && lines[insertIndex].startsWith("- [")) {
      insertIndex++;
    }
    lines.splice(insertIndex, 0, taskLine.trimEnd());
    writeFile(filepath, lines.join("\n"));
  } else {
    appendFile(filepath, `\n${INBOX_HEADING}\n${taskLine}`);
  }

  return task;
}
