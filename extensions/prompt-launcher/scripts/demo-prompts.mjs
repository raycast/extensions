import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const demoRoot = path.join(repoRoot, "demo", "prompt-sets");

const command = process.argv[2];

if (command === "setup") {
  await setupDemoPrompts();
} else if (command === "clean") {
  await cleanDemoPrompts();
} else {
  console.error("Usage: node scripts/demo-prompts.mjs <setup|clean>");
  process.exitCode = 1;
}

async function setupDemoPrompts() {
  await cleanDemoPrompts();

  await writeDemoFile(
    "prompt-set-1/review.md",
    `# Review Request

Review the following change at {now}.

Focus on correctness, regression risk, and missing tests.
`,
  );
  await writeDemoFile(
    "prompt-set-1/coding/refactor.MD",
    `# Refactor Plan

Create a small, safe refactor plan for the selected code.

Current time: {now}
`,
  );
  await writeDemoFile(
    "prompt-set-1/writing/blog-outline.md",
    `# Blog Outline

Create a concise outline for a technical article.

Audience: software engineers
`,
  );
  await writeDemoFile("prompt-set-1/ignored.txt", "This text file must not appear in Prompt Launcher.\n");
  await writeDemoFile("prompt-set-1/nested/notes.txt", "This nested text file must not appear in Prompt Launcher.\n");
  await writeDemoFile("prompt-set-1/.hidden/hidden.md", "# Hidden\n\nThis hidden file must not appear.\n");
  await writeDemoFile("prompt-set-1/.git/ignored.md", "# Git Ignored\n\nThis file must not appear.\n");
  await writeDemoFile("prompt-set-1/node_modules/ignored.md", "# Dependency Ignored\n\nThis file must not appear.\n");

  await writeDemoFile(
    "prompt-set-2/meeting/summary.md",
    `# Meeting Summary

Summarize the meeting notes from the clipboard.

Clipboard:
{clipboard}
`,
  );
  await writeDemoFile(
    "prompt-set-2/research/latest-check.md",
    `# Latest Information Check

Use {now} as the current time reference.

Check whether the information may have changed recently before answering.
`,
  );
  await writeDemoFile(
    "prompt-set-2/placeholders/all-placeholders.md",
    `# Dynamic Placeholders Check

Use this file to verify Copy Expanded Content.

Date: {date}
Time: {time}
Date and time: {datetime}
Weekday: {day}
Time zone: {timezone}
Now: {now}
UUID 1: {uuid}
UUID 2: {uuid}
Clipboard:
{clipboard}
`,
  );
  await writeDemoFile("prompt-set-2/draft.txt", "This draft file must not appear in Prompt Launcher.\n");

  await writeDemoFile(
    "prompt-set-3/simple.md",
    `# Simple Prompt

Rewrite the selected text clearly and concisely.
`,
  );
  await writeDemoFile(
    "prompt-set-3/placeholders/timezone.md",
    `# Time Zone Context

Current time zone: {timezone}
Current context: {now}
`,
  );

  console.log("Demo Prompt Sets created:");
  console.log(`Prompt Set 1 Folder: ${path.join(demoRoot, "prompt-set-1")}`);
  console.log(`Prompt Set 2 Folder: ${path.join(demoRoot, "prompt-set-2")}`);
  console.log(`Prompt Set 3 Folder: ${path.join(demoRoot, "prompt-set-3")}`);
}

async function cleanDemoPrompts() {
  await assertSafeDemoRoot();
  await rm(demoRoot, { recursive: true, force: true });
}

async function writeDemoFile(relativePath, content) {
  const filePath = path.join(demoRoot, relativePath);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content);
}

async function assertSafeDemoRoot() {
  const relativePath = path.relative(repoRoot, demoRoot);

  if (relativePath !== path.join("demo", "prompt-sets")) {
    throw new Error(`Refusing to remove unexpected path: ${demoRoot}`);
  }
}
