import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const demoRoot = path.join(repoRoot, "demo", "block-sets");

const command = process.argv[2];

if (command === "setup") {
  await setupDemoBlockSets();
} else if (command === "clean") {
  await cleanDemoBlockSets();
} else {
  console.error("Usage: node scripts/demo-block-sets.mjs <setup|clean>");
  process.exitCode = 1;
}

async function setupDemoBlockSets() {
  await cleanDemoBlockSets();

  await writeDemoFile(
    "block-set-1/review.md",
    `# Review Checklist

Use this checklist at {now}.

- Correctness
- Regression risk
- Missing tests
`,
  );
  await writeDemoFile(
    "block-set-1/coding/refactor.MD",
    `# Refactor Notes

Small refactor planning notes.

Current time: {now}
`,
  );
  await writeDemoFile(
    "block-set-1/writing/blog-outline.md",
    `# Blog Outline

Title:

Audience: software engineers

Sections:
- Context
- Key points
- Next steps
`,
  );
  await writeDemoFile("block-set-1/ignored.txt", "This text file must not appear in Local Copy Blocks.\n");
  await writeDemoFile("block-set-1/nested/notes.txt", "This nested text file must not appear in Local Copy Blocks.\n");
  await writeDemoFile("block-set-1/.hidden/hidden.md", "# Hidden\n\nThis hidden file must not appear.\n");
  await writeDemoFile("block-set-1/.git/ignored.md", "# Git Ignored\n\nThis file must not appear.\n");
  await writeDemoFile("block-set-1/node_modules/ignored.md", "# Dependency Ignored\n\nThis file must not appear.\n");

  await writeDemoFile(
    "block-set-2/meeting/summary.md",
    `# Meeting Summary Template

Notes source:

{clipboard}

Summary:
- Decisions:
- Action items:
`,
  );
  await writeDemoFile(
    "block-set-2/research/latest-check.md",
    `# Current Context Header

Current time reference: {now}

Use this block when copied content needs a clear current-time context.
`,
  );
  await writeDemoFile(
    "block-set-2/placeholders/all-placeholders.md",
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
  await writeDemoFile("block-set-2/draft.txt", "This draft file must not appear in Local Copy Blocks.\n");

  await writeDemoFile(
    "block-set-3/simple.md",
    `# Short Reply

Thanks. I will review this and follow up.
`,
  );
  await writeDemoFile(
    "block-set-3/placeholders/timezone.md",
    `# Time Zone Context

Current time zone: {timezone}
Current context: {now}
`,
  );

  console.log("Demo Block Sets created:");
  console.log(`Block Set 1 Folder: ${path.join(demoRoot, "block-set-1")}`);
  console.log(`Block Set 2 Folder: ${path.join(demoRoot, "block-set-2")}`);
  console.log(`Block Set 3 Folder: ${path.join(demoRoot, "block-set-3")}`);
}

async function cleanDemoBlockSets() {
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

  if (relativePath !== path.join("demo", "block-sets")) {
    throw new Error(`Refusing to remove unexpected path: ${demoRoot}`);
  }
}
