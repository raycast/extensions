import fs from "fs";
import path from "path";
import { createEmptyDocument, parseRaylogMarkdown } from "../src/lib/storage-schema";
import { mergeRaylogMarkdown, validateStorageNotePath } from "../src/lib/storage-markdown";
import type { TaskRecord, TaskStatus, TaskWorkLogRecord } from "../src/lib/types";

const DEFAULT_TASK_COUNT = 5000;

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  await validateStorageNotePath(options.sourceNotePath);

  const targetPath =
    options.outputPath ??
    path.join(
      path.dirname(options.sourceNotePath),
      `${path.basename(options.sourceNotePath, ".md")}.stress-${options.taskCount}.md`,
    );

  if (path.resolve(targetPath) === path.resolve(options.sourceNotePath)) {
    throw new Error("Refusing to overwrite the current Raylog datastore.");
  }

  const document = createEmptyDocument();
  document.tasks = Array.from({ length: options.taskCount }, (_, index) => createTaskRecord(index));

  const markdown = mergeRaylogMarkdown(buildNotePreamble(options.taskCount), document);
  parseRaylogMarkdown(markdown);

  await fs.promises.writeFile(targetPath, markdown, "utf8");

  process.stdout.write(
    [`Generated ${options.taskCount} tasks.`, `Source: ${options.sourceNotePath}`, `Output: ${targetPath}`].join("\n") +
      "\n",
  );
}

function parseArgs(argv: string[]): {
  sourceNotePath: string;
  outputPath?: string;
  taskCount: number;
} {
  let sourceNotePath: string | undefined;
  let outputPath: string | undefined;
  let taskCount = DEFAULT_TASK_COUNT;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--count") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("Missing value for --count.");
      }

      taskCount = Number.parseInt(value, 10);
      index += 1;
      continue;
    }

    if (arg === "--output") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("Missing value for --output.");
      }

      outputPath = path.resolve(value);
      index += 1;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }

    if (arg.startsWith("--")) {
      throw new Error(`Unknown option: ${arg}`);
    }

    if (sourceNotePath) {
      throw new Error("Only one source note path may be provided.");
    }

    sourceNotePath = path.resolve(arg);
  }

  if (!sourceNotePath) {
    printHelp();
    throw new Error("A path to your current Raylog markdown datastore is required.");
  }

  if (!Number.isInteger(taskCount) || taskCount <= 0) {
    throw new Error("--count must be a positive integer.");
  }

  return {
    sourceNotePath,
    outputPath,
    taskCount,
  };
}

function printHelp(): void {
  process.stdout
    .write(`Usage: npm run generate:stress-note -- <storage-note-path> [--count 5000] [--output /path/to/file.md]

Creates a new markdown file next to your current Raylog datastore and fills it
with a large set of valid tasks for stress testing.
`);
}

function buildNotePreamble(taskCount: number): string {
  return `# Raylog - Markdown Tasks Stress Test

Generated ${taskCount} tasks for extension stress testing.
Open this file as a separate Raylog datastore in Raycast to measure load and
interaction behavior without modifying your normal note.`;
}

function createTaskRecord(index: number): TaskRecord {
  const createdAt = dateForIndex(index, 0);
  const updatedAt = dateForIndex(index, 1);
  const status = statusForIndex(index);
  const hasStartDate = index % 3 !== 0;
  const hasDueDate = index % 4 !== 0;
  const workLogs = createWorkLogs(index, updatedAt);

  return {
    id: `stress-task-${String(index + 1).padStart(5, "0")}`,
    header: `Stress task ${index + 1}`,
    body: [
      `Synthetic task ${index + 1} for Raylog - Markdown Tasks stress testing.`,
      `Batch ${Math.floor(index / 100) + 1}, lane ${(index % 12) + 1}.`,
      `This record exists to exercise parsing, filtering, rendering, and scrolling at scale.`,
    ].join("\n\n"),
    workLogs,
    status,
    dueDate: hasDueDate ? dateForIndex(index, 14) : null,
    startDate: hasStartDate ? dateForIndex(index, -7) : null,
    completedAt: status === "done" || status === "archived" ? dateForIndex(index, 21) : null,
    createdAt,
    updatedAt,
  };
}

function createWorkLogs(index: number, updatedAt: string): TaskWorkLogRecord[] {
  const count = index % 5;

  return Array.from({ length: count }, (_, workLogIndex) => ({
    id: `stress-task-${index + 1}-log-${workLogIndex + 1}`,
    body: `Stress log ${workLogIndex + 1} for task ${index + 1}.`,
    createdAt: dateForIndex(index, workLogIndex + 2),
    updatedAt: workLogIndex % 2 === 0 ? updatedAt : null,
  }));
}

function statusForIndex(index: number): TaskStatus {
  const statuses: TaskStatus[] = ["open", "in_progress", "done", "archived"];
  return statuses[index % statuses.length];
}

function dateForIndex(index: number, dayOffset: number): string {
  const baseTime = Date.UTC(2026, 0, 1, 12, 0, 0);
  const hourOffset = index % 24;
  const minuteOffset = index % 60;
  return new Date(
    baseTime + (index + dayOffset) * 24 * 60 * 60 * 1000 + hourOffset * 60 * 60 * 1000 + minuteOffset * 60 * 1000,
  ).toISOString();
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
