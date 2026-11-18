import Ajv from "ajv";
import { isDeepStrictEqual } from "node:util";
import { z } from "zod";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { CallToolResult, Tool } from "@modelcontextprotocol/sdk/types.js";
import { ConnectionError, type ConnectionConfig } from "./config";
import { withEditsClient } from "./connection";
import { withProjectClient } from "./project-session";
import { collectPages } from "./discovery";
import verifiedSchemas from "./verified-schemas.json";
import editorSchemas from "./verified-editor-schemas.json";
const operationSchemas = { ...verifiedSchemas, ...editorSchemas };

export type ProjectOperation = keyof typeof verifiedSchemas;
export type Availability = Record<ProjectOperation, boolean>;
const ajv = new Ajv({ strict: false, allErrors: false });
const projectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  lastModified: z.string().optional(),
  duration: z.string().optional(),
  size: z.string().optional(),
  isFavorite: z.boolean().optional(),
  isPinned: z.boolean().optional(),
  isCloudOnly: z.boolean().optional(),
});
export type Project = z.infer<typeof projectSchema>;

export function getAvailability(tools: Tool[]): Availability {
  return Object.fromEntries(
    Object.entries(verifiedSchemas).map(([name, schema]) => [
      name,
      tools.some((tool) => tool.name === name && isDeepStrictEqual(tool.inputSchema, schema)),
    ]),
  ) as Availability;
}

export function decodeToolResult(result: CallToolResult): Record<string, unknown> {
  if (result.isError) {
    throw new ConnectionError(
      "Edits could not complete the operation",
      "Check Edits for details and refresh project state before trying again.",
    );
  }
  try {
    const text = result.content.filter((item) => item.type === "text");
    const data: unknown = result.structuredContent ?? (text.length === 1 ? JSON.parse(text[0].text) : undefined);
    return z
      .object({ ok: z.literal(true) })
      .passthrough()
      .parse(data);
  } catch {
    throw new ConnectionError(
      "Unrecognized Edits response",
      "The result could not be verified. Check Edits and refresh before trying again.",
    );
  }
}

export function parseProjects(data: Record<string, unknown>): { projects: Project[]; cloudRefreshTimedOut: boolean } {
  const parsed = z
    .object({ projects: z.array(projectSchema), cloudRefreshTimedOut: z.boolean().optional() })
    .safeParse(data);
  if (!parsed.success)
    throw new ConnectionError(
      "Project list unavailable",
      "Edits returned an unexpected project format. No projects were changed.",
    );
  const projects = parsed.data.projects;
  if (new Set(projects.map((project) => project.id)).size !== projects.length) {
    throw new ConnectionError(
      "Ambiguous project list",
      "Edits returned duplicate project identifiers. Refresh before selecting a project.",
    );
  }
  return { projects, cloudRefreshTimedOut: parsed.data.cloudRefreshTimedOut === true };
}

async function listTools(client: Client, signal: AbortSignal) {
  return collectPages(async (cursor) => {
    const result = await client.listTools({ cursor }, { signal, timeout: 10_000 });
    return { items: result.tools, nextCursor: result.nextCursor };
  });
}

export async function callVerifiedTool(
  client: Client,
  name: keyof typeof operationSchemas,
  args: Record<string, unknown>,
  signal: AbortSignal,
): Promise<Record<string, unknown>> {
  // Recheck the live schema immediately before execution; never use a stale capability cache.
  const tools = await listTools(client, signal);
  const tool = tools.find((candidate) => candidate.name === name);
  if (!tool || !isDeepStrictEqual(tool.inputSchema, operationSchemas[name])) {
    throw new ConnectionError(
      "Operation unavailable",
      "This operation is unavailable on the current Edits screen or its schema has changed. Open the requested project for text tools, or return home for project duplication, and refresh.",
    );
  }
  if (!ajv.compile(tool.inputSchema)(args)) {
    throw new ConnectionError("Invalid operation arguments", "The selected operation does not accept these values.");
  }
  const mutation = !["projects", "elements", "getElement"].includes(name);
  try {
    const result = await client.callTool({ name, arguments: args }, undefined, {
      signal,
      timeout: mutation ? 20_000 : 10_000,
    });
    return decodeToolResult(result as CallToolResult);
  } catch (error) {
    if (error instanceof ConnectionError) throw error;
    if (mutation) {
      throw new ConnectionError(
        "Operation outcome unknown",
        "Edits may have completed the action. Check the project in Edits and refresh before retrying. The extension did not retry.",
      );
    }
    throw error;
  }
}

export async function loadProjects(config: ConnectionConfig, signal?: AbortSignal) {
  return withEditsClient(
    config,
    async (client, sessionSignal) => {
      const available = getAvailability(await listTools(client, sessionSignal));
      const result = parseProjects(await callVerifiedTool(client, "projects", {}, sessionSignal));
      return { ...result, available };
    },
    signal,
  );
}

export type ProjectAction = "openProject" | "duplicateProject" | "renameProject" | "toggleFavorite" | "togglePin";

export async function runProjectAction(
  config: ConnectionConfig,
  action: ProjectAction,
  selected: Project,
  newName?: string,
): Promise<Project> {
  if (action === "renameProject" && !newName?.trim()) {
    throw new ConnectionError("Name required", "Enter a project name.");
  }
  return withProjectClient(config, async (client, signal) => {
    const before = parseProjects(await callVerifiedTool(client, "projects", {}, signal));
    const project = before.projects.find((candidate) => candidate.id === selected.id);
    if (!project) throw new ConnectionError("Project no longer available", "Refresh and select the project again.");
    if (
      (action === "toggleFavorite" && project.isFavorite !== selected.isFavorite) ||
      (action === "togglePin" && project.isPinned !== selected.isPinned)
    ) {
      throw new ConnectionError(
        "Project changed",
        "Its favorite or pinned status changed. Refresh before trying again.",
      );
    }
    const args: Record<string, unknown> = { id: project.id };
    // Edits requires both fields; a nonempty ID and empty name avoids ambiguous name lookup.
    if (action === "openProject") args.name = "";
    if (action === "renameProject") args.name = newName!.trim();
    const result = await callVerifiedTool(client, action, args, signal);
    if (action === "openProject") {
      if (result.id !== project.id)
        throw new ConnectionError("Opened project could not be verified", "Check Edits before continuing.");
      return project;
    }
    // A successful tool return is insufficient: verify the resulting project in a fresh listing.
    let after: Project[];
    try {
      after = parseProjects(await callVerifiedTool(client, "projects", {}, signal)).projects;
    } catch {
      throw new ConnectionError(
        "Action completed; verification failed",
        "Refresh the project list before repeating the action.",
      );
    }
    const updated = after.find(
      (candidate) => candidate.id === (action === "duplicateProject" ? result.id : project.id),
    );
    const verified =
      updated &&
      (action === "duplicateProject"
        ? !before.projects.some((candidate) => candidate.id === updated.id)
        : action === "renameProject"
          ? updated.name === newName!.trim()
          : action === "toggleFavorite"
            ? updated.isFavorite === !project.isFavorite
            : updated.isPinned === !project.isPinned);
    if (!verified)
      throw new ConnectionError("Action could not be verified", "Check Edits and refresh before repeating the action.");
    return updated;
  });
}
