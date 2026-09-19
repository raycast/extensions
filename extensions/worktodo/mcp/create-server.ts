import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { openProductionWorktodo } from "../src/shared/application/worktodo";
import { getRuntimeInfo } from "../src/shared/runtime-info";
import { registerTaskTools, type TaskToolDependencies } from "./task-tools";

const pingOutputSchema = z.object({
  status: z.literal("ok"),
  app: z.string(),
  version: z.string(),
  runtime: z.object({
    node: z.string(),
    sqlite: z.string().nullable(),
  }),
});

export type CreateServerOptions = Partial<TaskToolDependencies>;

export function createServer(options: CreateServerOptions = {}) {
  const runtimeInfo = getRuntimeInfo();
  const server = new McpServer(
    { name: "worktodo", version: runtimeInfo.version },
    {
      instructions:
        "Use list_projects, list_labels, and list_tasks to resolve stable IDs before writing. Worktodo stores tasks locally. Write tools change the shared task database; trash is recoverable and permanent deletion is unavailable. Label definitions are read-only through MCP, while task labelIds replace the complete assignment set. Use allDay dates as YYYY-MM-DD and timed due values as an exact Unix-millisecond instant plus IANA timezone. External writes appear in Raycast on its next supported refresh.",
    },
  );

  server.registerTool(
    "ping",
    {
      title: "Ping Worktodo",
      description: "Check that the local Worktodo MCP server is ready.",
      inputSchema: z.object({}).strict(),
      outputSchema: pingOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => {
      const output = { status: "ok" as const, ...getRuntimeInfo() };

      return {
        content: [{ type: "text" as const, text: `${output.app} MCP is ready.` }],
        structuredContent: output,
      };
    },
  );

  registerTaskTools(server, {
    openSession: options.openSession ?? openProductionWorktodo,
    now: options.now ?? Date.now,
    viewerTimeZone: options.viewerTimeZone ?? (() => Intl.DateTimeFormat().resolvedOptions().timeZone),
  });

  return server;
}
