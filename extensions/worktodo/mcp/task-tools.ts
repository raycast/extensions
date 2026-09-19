import { type CallToolResult, McpServer, type ToolAnnotations } from "@modelcontextprotocol/server";
import { z } from "zod";
import { DomainError, type Task } from "../src/shared/domain/model";
import type { TaskService } from "../src/shared/domain/task-service";
import { MAX_REPRESENTABLE_TIMESTAMP_MS, normalizeLabelName } from "../src/shared/domain/validation";
import {
  loadTaskView,
  resolveTaskView,
  TASK_VIEW_KINDS,
  tasksInTaskView,
  type TaskViewKind,
} from "../src/shared/application/task-views";

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 50;

const nonNegativeSafeIntegerSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const timestampSchema = z.number().int().nonnegative().max(MAX_REPRESENTABLE_TIMESTAMP_MS);
const prioritySchema = z.boolean();
const dueSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("none") }).strict(),
  z.object({ kind: z.literal("allDay"), date: z.string().describe("Gregorian date in YYYY-MM-DD format") }).strict(),
  z
    .object({
      kind: z.literal("timed"),
      instantMs: timestampSchema.describe("Unix epoch milliseconds"),
      timeZone: z.string().describe("IANA timezone identifier"),
    })
    .strict(),
]);
const taskSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    notes: z.string(),
    priority: prioritySchema,
    position: nonNegativeSafeIntegerSchema,
    projectId: z.string().nullable(),
    labelIds: z.array(z.string()),
    due: dueSchema,
    createdAtMs: timestampSchema,
    updatedAtMs: timestampSchema,
    completedAtMs: timestampSchema.nullable(),
    trashedAtMs: timestampSchema.nullable(),
  })
  .strict();
const projectSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    position: nonNegativeSafeIntegerSchema,
    createdAtMs: timestampSchema,
    updatedAtMs: timestampSchema,
  })
  .strict();
const labelSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    position: nonNegativeSafeIntegerSchema,
    createdAtMs: timestampSchema,
    updatedAtMs: timestampSchema,
  })
  .strict();
const taskViewSchema = z.enum(TASK_VIEW_KINDS);
const pageInputSchema = {
  query: z.string().optional().describe("Case-insensitive search substring"),
  offset: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),
  limit: z.number().int().min(1).max(MAX_PAGE_SIZE).optional(),
};
const pageSchema = {
  offset: nonNegativeSafeIntegerSchema,
  limit: z.number().int().min(1).max(MAX_PAGE_SIZE),
  total: nonNegativeSafeIntegerSchema,
  hasMore: z.boolean(),
};
const taskOutputSchema = z.object({ task: taskSchema }).strict();

const READ_ANNOTATIONS: ToolAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

type ToolSession = {
  service: TaskService;
  close: () => void;
};

export type TaskToolDependencies = {
  openSession: () => ToolSession;
  now: () => number;
  viewerTimeZone: () => string;
};

type TaskDocument = z.infer<typeof taskSchema>;

function taskDocument(task: Task): TaskDocument {
  return {
    id: task.id,
    title: task.title,
    notes: task.notes,
    priority: task.priority,
    position: task.position,
    projectId: task.projectId,
    labelIds: task.labelIds,
    due: task.due,
    createdAtMs: task.createdAtMs,
    updatedAtMs: task.updatedAtMs,
    completedAtMs: task.completedAtMs,
    trashedAtMs: task.trashedAtMs,
  };
}

function singleLine(value: string): string {
  return value.replace(/\s+/gu, " ").trim();
}

function taskText(action: string, task: Task): string {
  return `${action} “${singleLine(task.title)}” (${task.id}).`;
}

function successTaskResult(action: string, task: Task): CallToolResult {
  return {
    content: [{ type: "text", text: taskText(action, task) }],
    structuredContent: { task: taskDocument(task) },
  };
}

function failureResult(toolName: string, error: unknown): CallToolResult {
  if (error instanceof DomainError) {
    return {
      isError: true,
      content: [{ type: "text", text: `${error.code}: ${error.message}` }],
    };
  }

  console.error(`Worktodo MCP ${toolName} failed`, error);
  return {
    isError: true,
    content: [{ type: "text", text: "INTERNAL_ERROR: Worktodo could not complete the operation" }],
  };
}

function withSession(
  toolName: string,
  dependencies: TaskToolDependencies,
  operation: (service: TaskService) => CallToolResult,
): CallToolResult {
  let session: ToolSession | undefined;
  try {
    session = dependencies.openSession();
    return operation(session.service);
  } catch (error) {
    return failureResult(toolName, error);
  } finally {
    try {
      session?.close();
    } catch (error) {
      console.error(`Worktodo MCP ${toolName} session close failed`, error);
    }
  }
}

function normalizedSearch(value: string): string {
  return normalizeLabelName(value);
}

function filterTasks(service: TaskService, tasks: Task[], query: string | undefined): Task[] {
  const trimmed = query?.trim();
  if (!trimmed) {
    return tasks;
  }

  const search = normalizedSearch(trimmed);
  const projectNames = new Map(service.listProjects().map((project) => [project.id, project.name]));
  const labelNames = new Map(service.listLabels().map((label) => [label.id, label.name]));
  return tasks.filter((task) => {
    const values = [
      task.title,
      task.notes,
      task.projectId === null ? "No project" : (projectNames.get(task.projectId) ?? ""),
      ...task.labelIds.flatMap((labelId) => {
        const name = labelNames.get(labelId);
        return name ? [name] : [];
      }),
    ];
    return values.some((value) => normalizedSearch(value).includes(search));
  });
}

function taskListText(view: TaskViewKind, tasks: Task[], total: number, offset: number): string {
  if (total === 0) {
    return `No tasks matched the ${view} view.`;
  }
  const header = `Returned ${tasks.length} of ${total} matching ${view} tasks from offset ${offset}.`;
  return [header, ...tasks.map((task) => `- ${singleLine(task.title)} (${task.id})`)].join("\n");
}

function projectListText(projects: Array<{ id: string; name: string }>, total: number, offset: number): string {
  if (total === 0) {
    return "No projects matched.";
  }
  const lines = projects.map((project) => `- ${singleLine(project.name)} (${project.id})`);
  return [`Returned ${projects.length} of ${total} matching projects from offset ${offset}.`, ...lines].join("\n");
}

function labelListText(labels: Array<{ id: string; name: string }>, total: number, offset: number): string {
  if (total === 0) {
    return "No labels matched.";
  }
  const lines = labels.map((label) => `- ${singleLine(label.name)} (${label.id})`);
  return [`Returned ${labels.length} of ${total} matching labels from offset ${offset}.`, ...lines].join("\n");
}

export function registerTaskTools(server: McpServer, dependencies: TaskToolDependencies): void {
  server.registerTool(
    "list_projects",
    {
      title: "List Worktodo Projects",
      description: "List a bounded page of local Worktodo projects, including stable assignment IDs.",
      inputSchema: z.object(pageInputSchema).strict(),
      outputSchema: z
        .object({
          query: z.string().nullable(),
          ...pageSchema,
          projects: z.array(projectSchema),
        })
        .strict(),
      annotations: READ_ANNOTATIONS,
    },
    async ({ query, offset = 0, limit = DEFAULT_PAGE_SIZE }) =>
      withSession("list_projects", dependencies, (service) => {
        const search = query?.trim();
        const projects = service.listProjects().filter((project) => {
          if (!search) {
            return true;
          }
          const normalized = normalizedSearch(search);
          return normalizedSearch(project.name).includes(normalized);
        });
        const page = projects.slice(offset, offset + limit);
        const output = {
          query: search || null,
          offset,
          limit,
          total: projects.length,
          hasMore: offset + page.length < projects.length,
          projects: page,
        };
        return {
          content: [{ type: "text", text: projectListText(page, projects.length, offset) }],
          structuredContent: output,
        };
      }),
  );

  server.registerTool(
    "list_labels",
    {
      title: "List Worktodo Labels",
      description: "List and search a bounded page of global Worktodo labels, including stable assignment IDs.",
      inputSchema: z.object(pageInputSchema).strict(),
      outputSchema: z
        .object({
          query: z.string().nullable(),
          ...pageSchema,
          labels: z.array(labelSchema),
        })
        .strict(),
      annotations: READ_ANNOTATIONS,
    },
    async ({ query, offset = 0, limit = DEFAULT_PAGE_SIZE }) =>
      withSession("list_labels", dependencies, (service) => {
        const search = query?.trim();
        const labels = service.listLabels().filter((label) => {
          if (!search) {
            return true;
          }
          return normalizedSearch(label.name).includes(normalizedSearch(search));
        });
        const page = labels.slice(offset, offset + limit);
        const output = {
          query: search || null,
          offset,
          limit,
          total: labels.length,
          hasMore: offset + page.length < labels.length,
          labels: page,
        };
        return {
          content: [{ type: "text", text: labelListText(page, labels.length, offset) }],
          structuredContent: output,
        };
      }),
  );

  server.registerTool(
    "list_tasks",
    {
      title: "List Worktodo Tasks",
      description:
        "List and search a bounded page of local tasks by view. Use projectId only with view=project and labelId only with view=label.",
      inputSchema: z
        .object({
          view: taskViewSchema.optional(),
          projectId: z.string().optional(),
          labelId: z.string().optional(),
          timeZone: z.string().optional().describe("IANA timezone for all-day, Today, and This week evaluation"),
          ...pageInputSchema,
        })
        .strict(),
      outputSchema: z
        .object({
          view: taskViewSchema,
          query: z.string().nullable(),
          evaluatedAtMs: timestampSchema,
          timeZone: z.string(),
          ...pageSchema,
          tasks: z.array(taskSchema),
        })
        .strict(),
      annotations: READ_ANNOTATIONS,
    },
    async ({ view = "all", projectId, labelId, timeZone, query, offset = 0, limit = DEFAULT_PAGE_SIZE }) =>
      withSession("list_tasks", dependencies, (service) => {
        const taskView = loadTaskView(service, resolveTaskView(view, projectId, labelId), {
          evaluationInstantMs: dependencies.now(),
          viewerTimeZone: timeZone ?? dependencies.viewerTimeZone(),
        });
        const search = query?.trim();
        const matched = filterTasks(service, tasksInTaskView(taskView), search);
        const page = matched.slice(offset, offset + limit);
        const output = {
          view,
          query: search || null,
          evaluatedAtMs: taskView.evaluatedAtMs,
          timeZone: taskView.viewerTimeZone,
          offset,
          limit,
          total: matched.length,
          hasMore: offset + page.length < matched.length,
          tasks: page.map(taskDocument),
        };
        return {
          content: [{ type: "text", text: taskListText(view, page, matched.length, offset) }],
          structuredContent: output,
        };
      }),
  );

  server.registerTool(
    "get_task",
    {
      title: "Get Worktodo Task",
      description: "Get one local Worktodo task by its stable ID, including completed or trashed tasks.",
      inputSchema: z.object({ id: z.string() }).strict(),
      outputSchema: taskOutputSchema,
      annotations: READ_ANNOTATIONS,
    },
    async ({ id }) =>
      withSession("get_task", dependencies, (service) => successTaskResult("Found", service.getTask(id))),
  );

  server.registerTool(
    "create_task",
    {
      title: "Create Worktodo Task",
      description:
        "Create a local task. projectId defaults to null; labelIds replace the complete Label assignment set.",
      inputSchema: z
        .object({
          title: z.string(),
          notes: z.string().optional(),
          priority: prioritySchema.optional(),
          projectId: z.string().nullable().optional(),
          labelIds: z.array(z.string()).optional(),
          due: dueSchema.optional(),
        })
        .strict(),
      outputSchema: taskOutputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ title, notes, priority, projectId = null, labelIds, due }) =>
      withSession("create_task", dependencies, (service) =>
        successTaskResult("Created", service.createTask({ title, notes, priority, projectId, labelIds, due })),
      ),
  );

  server.registerTool(
    "update_task",
    {
      title: "Update Worktodo Task",
      description:
        "Replace selected content fields on one active local task. This tool does not move or change lifecycle state.",
      inputSchema: z
        .object({
          id: z.string(),
          title: z.string().optional(),
          notes: z.string().optional(),
          priority: prioritySchema.optional(),
          labelIds: z.array(z.string()).optional(),
          due: dueSchema.optional(),
        })
        .strict(),
      outputSchema: taskOutputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ id, title, notes, priority, labelIds, due }) =>
      withSession("update_task", dependencies, (service) => {
        if (
          title === undefined &&
          notes === undefined &&
          priority === undefined &&
          labelIds === undefined &&
          due === undefined
        ) {
          throw new DomainError("INVALID_ARGUMENT", "Provide at least one task field to update");
        }
        return successTaskResult("Updated", service.updateTask(id, { title, notes, priority, labelIds, due }));
      }),
  );

  server.registerTool(
    "move_task",
    {
      title: "Move Worktodo Task",
      description: "Assign one active local task to a project or clear its project using a stable ID.",
      inputSchema: z.object({ id: z.string(), projectId: z.string().nullable() }).strict(),
      outputSchema: taskOutputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ id, projectId }) =>
      withSession("move_task", dependencies, (service) => successTaskResult("Moved", service.moveTask(id, projectId))),
  );

  const lifecycleTools = [
    {
      name: "complete_task",
      title: "Complete Worktodo Task",
      description: "Mark one active local task complete. Repeating the call is a no-op.",
      action: "Completed",
      run: (service: TaskService, id: string) => service.completeTask(id),
    },
    {
      name: "reopen_task",
      title: "Reopen Worktodo Task",
      description: "Reopen one completed local task. Repeating the call is a no-op.",
      action: "Reopened",
      run: (service: TaskService, id: string) => service.reopenTask(id),
    },
    {
      name: "trash_task",
      title: "Trash Worktodo Task",
      description: "Move one local task to recoverable Trash. This never permanently deletes task data.",
      action: "Trashed",
      run: (service: TaskService, id: string) => service.trashTask(id),
    },
    {
      name: "restore_task",
      title: "Restore Worktodo Task",
      description: "Restore one local task from Trash while preserving its content, project, and completion state.",
      action: "Restored",
      run: (service: TaskService, id: string) => service.restoreTask(id),
    },
  ] as const;

  for (const tool of lifecycleTools) {
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: z.object({ id: z.string() }).strict(),
        outputSchema: taskOutputSchema,
        annotations: {
          readOnlyHint: false,
          destructiveHint: true,
          idempotentHint: true,
          openWorldHint: false,
        },
      },
      async ({ id }) =>
        withSession(tool.name, dependencies, (service) => successTaskResult(tool.action, tool.run(service, id))),
    );
  }
}
