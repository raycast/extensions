import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import type { Keyboard } from "@raycast/api";
import {
  buildMenuBarTaskActionSpecs,
  buildTaskDetailActionSpecs,
  buildTaskListActionSpecs,
} from "../src/lib/task-flow";
import type { TaskRecord } from "../src/lib/types";

const workspaceRoot = path.resolve(__dirname, "..");

test("development docs include the complete validated command flow", async () => {
  const markdown = await readWorkspaceFile("docs/DEVELOPMENT.md");
  const diagram = extractSingleMermaidBlock(markdown, "docs/DEVELOPMENT.md");
  const parsed = parseMermaidFlow(diagram);

  assertEdge(parsed, "Raylog", "", "List Tasks command");
  assertEdge(parsed, "Raylog", "", "Add Task command");
  assertEdge(parsed, "Raylog", "", "Refresh Menu Bar command");
  assertEdge(
    parsed,
    "List Tasks command",
    "",
    "Storage note configured and valid?",
  );
  assertEdge(
    parsed,
    "Add Task command",
    "",
    "Storage note configured and valid?",
  );
  assertEdge(
    parsed,
    "Storage note configured and valid?",
    "No",
    "Setup / reset empty state",
  );
  assertEdge(
    parsed,
    "Setup / reset empty state",
    "Open Extension Preferences",
    "Storage note configured and valid?",
  );
  assertEdge(
    parsed,
    "Setup / reset empty state",
    "Generate New Task Database",
    "Storage note configured and valid?",
  );
  assertEdge(
    parsed,
    "Setup / reset empty state",
    "Reset Storage Note",
    "Storage note configured and valid?",
  );

  assertEdge(
    parsed,
    "Storage note configured and valid?",
    "Yes, launch last used list layout",
    "Task summary with detail pane",
  );
  assertEdge(
    parsed,
    "Storage note configured and valid?",
    "Yes, launch last used list layout",
    "Task list without detail pane",
  );
  assertEdge(
    parsed,
    "Storage note configured and valid?",
    "Yes, launch Add Task",
    "Standalone Add Task form",
  );
  assertEdge(
    parsed,
    "Task summary with detail pane",
    "Enter",
    "View Task window",
  );
  assertEdge(
    parsed,
    "Task summary with detail pane",
    "Cmd+F",
    "Task list without detail pane",
  );
  assertEdge(
    parsed,
    "Task summary with detail pane",
    "Cmd+L",
    "Edit Task form (new log focused)",
  );
  assertEdge(
    parsed,
    "Task summary with detail pane",
    "Cmd+Shift+C",
    "Complete selected task",
  );
  assertEdge(parsed, "Task summary with detail pane", "Cmd+N", "Add Task form");
  assertEdge(
    parsed,
    "Task summary with detail pane",
    "Cmd+E",
    "Edit Task form",
  );
  assertEdge(
    parsed,
    "Task list without detail pane",
    "Enter",
    "View Task window",
  );
  assertEdge(
    parsed,
    "Task list without detail pane",
    "Cmd+F",
    "Task summary with detail pane",
  );
  assertEdge(
    parsed,
    "Full-window task detail",
    "Default action: Log Work",
    "Edit Task form (new log focused)",
  );
  assertEdge(parsed, "Full-window task detail", "Cmd+Shift+C", "Complete task");
  assertEdge(
    parsed,
    "Edit Task form (new log focused)",
    "Save",
    "Full-window task detail",
  );
  assertEdge(parsed, "Full-window task detail", "Delete Task", "Delete task");
  assertEdge(
    parsed,
    "Current task in menu bar",
    "Click current task",
    "Menu bar task submenu",
  );
  assertEdge(
    parsed,
    "Current task in menu bar",
    "Click task in Next 5 Tasks",
    "Menu bar task submenu",
  );
  assertEdge(
    parsed,
    "Menu bar task submenu",
    "Open Task",
    "Full-window task detail",
  );
  assertEdge(parsed, "Menu bar task submenu", "Start Task", "Start task");
  assertEdge(parsed, "Menu bar task submenu", "Complete Task", "Complete task");
  assertEdge(parsed, "Menu bar task submenu", "Archive Task", "Archive task");
  assertEdge(
    parsed,
    "Current task in menu bar",
    "Open Task List",
    "Task summary with detail pane",
  );
  assertEdge(
    parsed,
    "Current task in menu bar",
    "Open Task List",
    "Task list without detail pane",
  );
  assertEdge(
    parsed,
    "Refresh Menu Bar command",
    "No storage note",
    "Set Up Raylog menu bar state",
  );
  assertEdge(
    parsed,
    "Set Up Raylog menu bar state",
    "Open Extension Preferences",
    "Storage note configured and valid?",
  );

  assert.ok(!diagram.includes("Cmd+Shift+O"));
  assert.ok(!diagram.includes("Log Task command"));
  assert.ok(!diagram.includes("Task Metadata window"));
});

test("readme highlights task logging and current setup guidance", async () => {
  const readme = await readWorkspaceFile("README.md");

  assert.match(readme, /progress logging/i);
  assert.match(readme, /built-in work logging/i);
  assert.match(readme, /Cmd\+L/);
  assert.match(
    readme,
    /menu bar feature is inactive until you run `Refresh Menu Bar`/i,
  );
  assert.match(readme, /"schemaVersion": 1/);
  assert.doesNotMatch(readme, /```mermaid/);
});

test("development docs stay aligned with implementation flow wiring", async () => {
  const markdown = await readWorkspaceFile("docs/DEVELOPMENT.md");
  const diagram = extractSingleMermaidBlock(markdown, "docs/DEVELOPMENT.md");
  const parsed = parseMermaidFlow(diagram);
  const documentedEdges = [
    ...buildDocumentedListFlowEdges(createTask({ status: "todo" })),
    ...buildDocumentedListFlowEdges(createTask({ status: "in_progress" })),
    ...buildDocumentedListFlowEdges(createTask({ status: "done" })),
    ...buildDocumentedDetailFlowEdges(createTask({ status: "todo" })),
    ...buildDocumentedDetailFlowEdges(createTask({ status: "in_progress" })),
    ...buildDocumentedDetailFlowEdges(createTask({ status: "done" })),
    ...buildDocumentedDetailFlowEdges(createTask({ status: "archived" })),
    ...buildDocumentedMenuFlowEdges(createTask({ status: "todo" })),
    ...buildDocumentedMenuFlowEdges(createTask({ status: "in_progress" })),
  ];

  for (const edge of documentedEdges) {
    assertEdge(parsed, edge.from, edge.action, edge.to);
  }
});

test("documented action-derived Mermaid edges map back to implementation", async () => {
  const markdown = await readWorkspaceFile("docs/DEVELOPMENT.md");
  const diagram = extractSingleMermaidBlock(markdown, "docs/DEVELOPMENT.md");
  const parsed = parseMermaidFlow(diagram);

  const reverseCheckedEdges = [
    ...getDocumentedEdgesForNode(
      parsed,
      "Task summary with detail pane",
      new Set([
        "Enter",
        "Cmd+L",
        "Cmd+N",
        "Cmd+E",
        "Cmd+Shift+C",
        "Cmd+S",
        "Cmd+R",
        "Cmd+Shift+A",
      ]),
    ),
    ...getDocumentedEdgesForNode(
      parsed,
      "Full-window task detail",
      new Set([
        "Default action: Log Work",
        "Cmd+E",
        "Cmd+Shift+C",
        "Start Task",
        "Reopen Task",
        "Archive Task",
        "Delete Task",
      ]),
    ),
    ...getDocumentedEdgesForNode(
      parsed,
      "Menu bar task submenu",
      new Set(["Open Task", "Start Task", "Complete Task", "Archive Task"]),
    ),
  ];

  for (const edge of reverseCheckedEdges) {
    assertDocumentedEdgeIsImplemented(edge);
  }
});

async function readWorkspaceFile(relativePath: string): Promise<string> {
  return fs.promises.readFile(path.join(workspaceRoot, relativePath), "utf8");
}

function extractSingleMermaidBlock(
  markdown: string,
  fileLabel: string,
  anchor?: string,
): string {
  const scopedMarkdown = anchor
    ? markdown.slice(markdown.indexOf(anchor))
    : markdown;
  const matches = [...scopedMarkdown.matchAll(/```mermaid\n([\s\S]*?)```/g)];

  assert.equal(
    matches.length,
    1,
    `${fileLabel} should contain exactly one Mermaid block in the targeted section.`,
  );

  return matches[0][1].trim();
}

function parseMermaidFlow(diagram: string): {
  labelsById: Map<string, string>;
  edges: Array<{ from: string; action: string; to: string }>;
} {
  const labelsById = new Map<string, string>();
  for (const match of diagram.matchAll(/([A-Za-z0-9_]+)\["([^"]+)"\]/g)) {
    labelsById.set(match[1], match[2]);
  }

  const edges: Array<{ from: string; action: string; to: string }> = [];
  for (const rawLine of diagram.split("\n")) {
    const line = rawLine.trim().replace(/([A-Za-z0-9_]+)\["[^"]+"\]/g, "$1");
    const match = line.match(
      /^([A-Za-z0-9_]+)\s*-->\s*(?:\|"([^"]+)"\||\|([^|]+)\|)?\s*([A-Za-z0-9_]+)/,
    );

    if (!match) {
      continue;
    }

    edges.push({
      from: labelsById.get(match[1]) ?? match[1],
      action: (match[2] ?? match[3] ?? "").trim(),
      to: labelsById.get(match[4]) ?? match[4],
    });
  }

  return { labelsById, edges };
}

function assertEdge(
  parsed: {
    edges: Array<{ from: string; action: string; to: string }>;
  },
  from: string,
  action: string,
  to: string,
) {
  assert.ok(
    parsed.edges.some(
      (edge) => edge.from === from && edge.action === action && edge.to === to,
    ),
    `Missing Mermaid edge: ${from} --${action || "(unlabeled)"}--> ${to}`,
  );
}

function getDocumentedEdgesForNode(
  parsed: {
    edges: Array<{ from: string; action: string; to: string }>;
  },
  from: string,
  actions: Set<string>,
) {
  return parsed.edges.filter(
    (edge) => edge.from === from && actions.has(edge.action),
  );
}

function buildDocumentedListFlowEdges(task: TaskRecord) {
  const specs = buildTaskListActionSpecs({
    notePath: "/tmp/raylog-test.md",
    repository: createRepositoryStub(),
    onReload: async () => undefined,
    task,
    taskLogStatusBehavior: "auto_start",
  });

  return specs
    .filter((spec) => spec.title !== "Delete Task")
    .map((spec) => ({
      from: "Task summary with detail pane",
      action: mapListSpecToDiagramAction(spec),
      to: mapListSpecToDiagramTarget(spec),
    }));
}

function buildDocumentedDetailFlowEdges(task: TaskRecord) {
  const specs = buildTaskDetailActionSpecs({
    notePath: "/tmp/raylog-test.md",
    repository: createRepositoryStub(),
    task,
    taskLogStatusBehavior: "auto_start",
    onReload: async () => undefined,
    onDidDelete: async () => undefined,
  });

  return specs
    .filter((spec) => spec.title !== "Add Task")
    .map((spec, index) => ({
      from: "Full-window task detail",
      action: mapDetailSpecToDiagramAction(spec, index),
      to: mapDetailSpecToDiagramTarget(spec),
    }));
}

function buildDocumentedMenuFlowEdges(task: TaskRecord) {
  const specs = buildMenuBarTaskActionSpecs(task);
  return specs.map((spec) => ({
    from: "Menu bar task submenu",
    action: spec.title,
    to: mapMenuSpecToDiagramTarget(spec.title),
  }));
}

function mapListSpecToDiagramTarget(
  spec: ReturnType<typeof buildTaskListActionSpecs>[number],
): string {
  switch (spec.title) {
    case "Open Task":
      return "View Task window";
    case "Log Work":
      return "Edit Task form (new log focused)";
    case "Edit Task":
      return "Edit Task form";
    case "Add Task":
      return "Add Task form";
    case "Complete Task":
      return "Complete selected task";
    case "Start Task":
      return "Start selected task";
    case "Reopen Task":
      return "Reopen selected task";
    case "Archive Task":
      return "Archive selected task";
    case "Delete Task":
      return "Delete task";
    default:
      return spec.title;
  }
}

function mapListSpecToDiagramAction(
  spec: ReturnType<typeof buildTaskListActionSpecs>[number],
): string {
  if (spec.title === "Open Task") {
    return "Enter";
  }

  return spec.shortcut ? formatShortcut(spec.shortcut) : spec.title;
}

function mapDetailSpecToDiagramTarget(
  spec: ReturnType<typeof buildTaskDetailActionSpecs>[number],
): string {
  switch (spec.title) {
    case "Log Work":
      return "Edit Task form (new log focused)";
    case "Edit Task":
      return "Edit Task form";
    case "Add Task":
      return "Add Task form";
    case "Complete Task":
      return "Complete task";
    case "Start Task":
      return "Start task";
    case "Reopen Task":
      return "Reopen task";
    case "Archive Task":
      return "Archive task";
    case "Delete Task":
      return "Delete task";
    default:
      return spec.title;
  }
}

function mapDetailSpecToDiagramAction(
  spec: ReturnType<typeof buildTaskDetailActionSpecs>[number],
  index: number,
): string {
  if (index === 0 && spec.title === "Log Work") {
    return "Default action: Log Work";
  }

  if (spec.title === "Edit Task" || spec.title === "Complete Task") {
    return spec.shortcut ? formatShortcut(spec.shortcut) : spec.title;
  }

  return spec.title;
}

function mapMenuSpecToDiagramTarget(title: string): string {
  switch (title) {
    case "Open Task":
      return "Full-window task detail";
    case "Start Task":
      return "Start task";
    case "Complete Task":
      return "Complete task";
    case "Archive Task":
      return "Archive task";
    default:
      return title;
  }
}

function formatShortcut(shortcut: Keyboard.Shortcut): string {
  const macShortcut = (
    "macOS" in shortcut
      ? shortcut.macOS
      : "macos" in shortcut
        ? shortcut.macos
        : shortcut
  ) as { modifiers: string[]; key: string };
  const modifierLabels = macShortcut.modifiers.map((modifier) => {
    switch (modifier) {
      case "cmd":
        return "Cmd";
      case "ctrl":
        return "Ctrl";
      case "shift":
        return "Shift";
      case "opt":
        return "Opt";
      default:
        return modifier;
    }
  });

  return [...modifierLabels, macShortcut.key.toUpperCase()].join("+");
}

function assertDocumentedEdgeIsImplemented(edge: {
  from: string;
  action: string;
  to: string;
}) {
  const implementedEdges = getImplementedEdgesForSource(edge.from);

  assert.ok(
    implementedEdges.some(
      (candidate) =>
        candidate.action === edge.action && candidate.to === edge.to,
    ),
    `Documented Mermaid edge is not implemented: ${edge.from} --${edge.action}--> ${edge.to}`,
  );
}

function getImplementedEdgesForSource(source: string) {
  switch (source) {
    case "Task summary with detail pane":
      return [
        ...buildDocumentedListFlowEdges(createTask({ status: "todo" })),
        ...buildDocumentedListFlowEdges(createTask({ status: "in_progress" })),
        ...buildDocumentedListFlowEdges(createTask({ status: "done" })),
      ];
    case "Full-window task detail":
      return [
        ...buildDocumentedDetailFlowEdges(createTask({ status: "todo" })),
        ...buildDocumentedDetailFlowEdges(
          createTask({ status: "in_progress" }),
        ),
        ...buildDocumentedDetailFlowEdges(createTask({ status: "done" })),
        ...buildDocumentedDetailFlowEdges(createTask({ status: "archived" })),
      ];
    case "Menu bar task submenu":
      return [
        ...buildDocumentedMenuFlowEdges(createTask({ status: "todo" })),
        ...buildDocumentedMenuFlowEdges(createTask({ status: "in_progress" })),
      ];
    default:
      return [];
  }
}

function createRepositoryStub() {
  return {
    completeTask: async () => createTask({ status: "done" }),
    updateTask: async () => createTask(),
    createTask: async () => createTask(),
    createWorkLog: async () => ({
      id: "log-2",
      body: "Logged progress",
      createdAt: "2026-04-03T00:00:00.000Z",
      updatedAt: null,
    }),
    startTask: async () => createTask({ status: "in_progress" }),
    reopenTask: async () => createTask(),
    archiveTask: async () => createTask({ status: "archived" }),
    deleteTask: async () => undefined,
  } as never;
}

function createTask(
  overrides: Partial<{
    id: string;
    header: string;
    body: string;
    workLogs: never[];
    status: "todo" | "in_progress" | "done" | "archived";
    dueDate: null;
    startDate: null;
    completedAt: null;
    createdAt: string;
    updatedAt: string;
  }> = {},
) {
  return {
    id: "task-id",
    header: "Task",
    body: "Task body",
    workLogs: [],
    status: "todo" as const,
    dueDate: null,
    startDate: null,
    completedAt: null,
    createdAt: "2026-04-03T00:00:00.000Z",
    updatedAt: "2026-04-03T00:00:00.000Z",
    ...overrides,
  };
}
