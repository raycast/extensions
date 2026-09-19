import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Client, type CallToolResult } from "@modelcontextprotocol/client";
import { getDefaultEnvironment, StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { afterEach, describe, expect, it } from "vitest";
import { WORKTODO_DATABASE_PATH_ENV } from "../../mcp/runtime-options";
import { MAX_REPRESENTABLE_TIMESTAMP_MS } from "../../src/shared/domain/validation";
import { openWorktodoAtPath } from "../../src/shared/application/worktodo";

const temporaryDirectories: string[] = [];

function createTransport(databasePath?: string, environment: Record<string, string> = {}) {
  return new StdioClientTransport({
    command: process.execPath,
    args: [path.resolve("dist/mcp/server.js")],
    cwd: process.cwd(),
    env: {
      ...getDefaultEnvironment(),
      ...environment,
      ...(databasePath === undefined ? {} : { [WORKTODO_DATABASE_PATH_ENV]: databasePath }),
    },
    stderr: "pipe",
  });
}

async function connect(databasePath?: string) {
  const transport = createTransport(databasePath);
  const client = new Client({ name: "worktodo-test", version: "0.0.0" });
  await client.connect(transport);
  return { client, transport };
}

function tasksFrom(result: CallToolResult): Array<Record<string, unknown>> {
  expect(result.isError).not.toBe(true);
  return result.structuredContent?.tasks as Array<Record<string, unknown>>;
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("Worktodo MCP stdio server", () => {
  it("discovers and calls the ping tool", async () => {
    const { client } = await connect();

    try {
      const { tools } = await client.listTools();
      expect(tools.map((tool) => tool.name)).toEqual(
        expect.arrayContaining(["ping", "list_projects", "list_labels", "list_tasks", "create_task", "trash_task"]),
      );
      expect(tools.find((tool) => tool.name === "ping")).toMatchObject({
        name: "ping",
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
      });

      const result = await client.callTool({ name: "ping", arguments: {} });
      expect(result.isError).not.toBe(true);
      expect(result.content).toEqual([{ type: "text", text: "Worktodo MCP is ready." }]);
      expect(result.structuredContent).toMatchObject({
        status: "ok",
        app: "Worktodo",
        version: "0.0.0",
        runtime: { node: process.versions.node },
      });
    } finally {
      await client.close();
    }
  });

  it("creates and reloads a task through the compiled process at an explicit database path", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "worktodo-mcp-stdio-test-"));
    temporaryDirectories.push(directory);
    const databasePath = path.join(directory, "store", "worktodo.sqlite");
    const setup = openWorktodoAtPath(databasePath);
    const waiting = setup.service.createLabel("Waiting");
    setup.close();

    const first = await connect(databasePath);
    let taskId: string;
    try {
      const labels = await first.client.callTool({ name: "list_labels", arguments: {} });
      expect(labels.structuredContent).toMatchObject({ labels: [{ id: waiting.id, name: "Waiting" }] });
      const discoveredLabelId = (labels.structuredContent?.labels as Array<{ id: string }>)[0].id;
      const created = await first.client.callTool({
        name: "create_task",
        arguments: {
          title: "Persist through stdio",
          notes: "Use the compiled server",
          priority: true,
          labelIds: [discoveredLabelId],
          due: { kind: "allDay", date: "2026-08-31" },
        },
      });
      expect(created.isError).not.toBe(true);
      expect(created.structuredContent).toMatchObject({
        task: {
          title: "Persist through stdio",
          notes: "Use the compiled server",
          priority: true,
          projectId: null,
          labelIds: [discoveredLabelId],
          due: { kind: "allDay", date: "2026-08-31" },
        },
      });
      taskId = (created.structuredContent?.task as { id: string }).id;
      expect(tasksFrom(await first.client.callTool({ name: "list_tasks", arguments: { view: "all" } }))).toEqual([
        expect.objectContaining({ id: taskId, title: "Persist through stdio", labelIds: [waiting.id] }),
      ]);
    } finally {
      await first.client.close();
    }

    const second = await connect(databasePath);
    try {
      expect(tasksFrom(await second.client.callTool({ name: "list_tasks", arguments: { view: "all" } }))).toEqual([
        expect.objectContaining({ id: taskId, title: "Persist through stdio", labelIds: [waiting.id] }),
      ]);
    } finally {
      await second.client.close();
    }

    await expect(stat(databasePath)).resolves.toMatchObject({ mode: expect.any(Number) });
  });

  it("rejects an unrepresentable timed due value before the compiled process writes it", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "worktodo-mcp-stdio-date-test-"));
    temporaryDirectories.push(directory);
    const databasePath = path.join(directory, "store", "worktodo.sqlite");
    const context = await connect(databasePath);
    try {
      expect(
        await context.client.callTool({
          name: "create_task",
          arguments: {
            title: "Invalid timed due",
            due: { kind: "timed", instantMs: MAX_REPRESENTABLE_TIMESTAMP_MS + 1, timeZone: "UTC" },
          },
        }),
      ).toMatchObject({ isError: true });
      expect(tasksFrom(await context.client.callTool({ name: "list_tasks", arguments: { view: "all" } }))).toEqual([]);
    } finally {
      await context.client.close();
    }
  });

  it("rejects a relative database override without falling back to a home-directory store", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "worktodo-mcp-stdio-invalid-test-"));
    temporaryDirectories.push(directory);
    const fakeHome = path.join(directory, "home");
    const transport = createTransport("relative/worktodo.sqlite", { HOME: fakeHome });
    const client = new Client({ name: "worktodo-invalid-path-test", version: "0.0.0" });

    await expect(client.connect(transport)).rejects.toThrow();
    await client.close();
    await expect(
      stat(path.join(fakeHome, "Library", "Application Support", "Worktodo", "worktodo.sqlite")),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });
});
