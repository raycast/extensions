import { z } from "zod";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { ConnectionError, type ConnectionConfig } from "./config";
import { withProjectClient } from "./project-session";
import { callVerifiedTool, parseProjects } from "./projects";

const textElement = z.object({
  id: z.string().min(1),
  content: z.literal("text"),
  text: z.string(),
  startTime: z.number().finite(),
  endTime: z.number().finite(),
});
function fail(title: string): never {
  throw new ConnectionError(title, "Check the project in Edits before trying again. The extension did not retry.");
}
async function openExact(client: Client, signal: AbortSignal, projectId: string) {
  const { projects } = parseProjects(await callVerifiedTool(client, "projects", {}, signal));
  const project = projects.find((p) => p.id === projectId);
  if (!project) fail("Project not found");
  const opened = await callVerifiedTool(client, "openProject", { id: projectId, name: "" }, signal);
  if (opened.id !== projectId) fail("Opened project could not be verified");
  return { id: project.id, name: project.name };
}
async function readText(client: Client, signal: AbortSignal, elementId: string) {
  const result = textElement.safeParse(await callVerifiedTool(client, "getElement", { id: elementId }, signal));
  if (!result.success || result.data.id !== elementId) fail("Text element could not be verified");
  return result.data;
}

/** Opens the exact project; only text and timing metadata leave the local application. */
export async function aiListProjectText(config: ConnectionConfig, projectId: string) {
  return withProjectClient(config, async (client, signal) => {
    const project = await openExact(client, signal, projectId);
    const texts: z.infer<typeof textElement>[] = [];
    const seen = new Set<string>();
    let offset = 0;
    for (let page = 0; page < 100; page++) {
      const result = z
        .object({
          elements: z.array(z.object({ id: z.string(), content: z.string() }).passthrough()),
          total: z.number().int().nonnegative(),
          nextOffset: z.number().int().nonnegative().optional(),
        })
        .parse(await callVerifiedTool(client, "elements", { offset, limit: 100 }, signal));
      for (const element of result.elements) {
        if (seen.has(element.id)) fail("Project elements changed during inspection");
        seen.add(element.id);
        if (element.content === "text") texts.push(textElement.parse(element));
      }
      const next = result.nextOffset ?? offset + result.elements.length;
      if (next >= result.total) return { project, elements: texts };
      if (next <= offset) fail("Project text listing is incomplete");
      offset = next;
    }
    fail("Project is too large to inspect completely");
  });
}

export type EditProjectTextInput = {
  projectId: string;
  elementId: string;
  expectedText: string;
  text: string;
};
export async function aiEditProjectText(config: ConnectionConfig, input: EditProjectTextInput) {
  if (!input.text.trim() || input.text.length > 10000) fail("Provide between 1 and 10000 characters of text");
  return withProjectClient(
    config,
    async (client, signal) => {
      const project = await openExact(client, signal, input.projectId);
      const before = await readText(client, signal, input.elementId);
      if (before.text !== input.expectedText) fail("Text changed since inspection");
      const changed = before.text !== input.text;
      if (changed) {
        const edited = await callVerifiedTool(client, "editText", { id: input.elementId, text: input.text }, signal);
        if (edited.text !== input.text) fail("Text edit response could not be verified");
      }
      const current = await readText(client, signal, input.elementId);
      if (current.text !== input.text) fail("Text edit could not be verified");
      const saved = await callVerifiedTool(client, "saveProject", {}, signal);
      if (saved.saved !== true || saved.projectId !== input.projectId) fail("Saved project could not be verified");
      const closed = await callVerifiedTool(client, "closeProject", {}, signal);
      if (closed.closedProjectId !== input.projectId) fail("Closed project could not be verified");
      await openExact(client, signal, input.projectId);
      const persisted = await readText(client, signal, input.elementId);
      if (persisted.text !== input.text) fail("Saved text did not persist after reopening");
      return {
        project,
        element: persisted,
        previousText: before.text,
        changed,
        saved: true,
        verifiedAfterReopen: true,
      };
    },
    60_000,
  );
}
