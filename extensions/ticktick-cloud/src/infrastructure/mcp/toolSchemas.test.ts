import { describe, expect, it } from "vitest";

import { cloneSanitizedMcpCatalog } from "../../test/fixtures/mcpCatalog";
import type { JsonObject, McpToolDefinition } from "./McpClientPort";
import { assessMcpCatalog, resolveLocalRef } from "./toolSchemas";

function tool(catalog: McpToolDefinition[], name: string): McpToolDefinition {
  const match = catalog.find((candidate) => candidate.name === name);
  if (!match) throw new Error(`Missing test fixture tool: ${name}`);
  return match;
}

function schemaDefinitions(schema: JsonObject): Record<string, JsonObject> {
  return schema.$defs as Record<string, JsonObject>;
}

function filterProperties(catalog: McpToolDefinition[]): JsonObject {
  const schema = tool(catalog, "filter_tasks").inputSchema;
  return schemaDefinitions(schema).TaskFilterOpenapi.properties as JsonObject;
}

function moveItemProperties(catalog: McpToolDefinition[]): JsonObject {
  const schema = tool(catalog, "move_task").inputSchema;
  return schemaDefinitions(schema).OpenMoveProject.properties as JsonObject;
}

function hostileSchema(): JsonObject {
  const schema: JsonObject = { type: "object", properties: {} };
  Object.defineProperty(schema, "required", {
    enumerable: true,
    get(): never {
      throw new Error("hostile schema getter");
    },
  });
  return schema;
}

describe("assessMcpCatalog", () => {
  it("qualifies the complete live catalog with filter queries and update-status reopen", () => {
    expect(assessMcpCatalog(cloneSanitizedMcpCatalog())).toEqual({
      eligible: true,
      missing: [],
      reopenStrategy: "update-status",
      queryStrategy: "filter",
    });
  });

  it.each([
    ["list_projects", "projects"],
    ["get_task_by_id", "task-lookup"],
    ["create_task", "create"],
    ["update_task", "update"],
    ["move_task", "move"],
    ["complete_task", "complete"],
    ["delete_task", "cleanup-delete"],
    ["filter_tasks", "task-query"],
  ])("disqualifies the catalog when %s is absent", (name, requirement) => {
    const catalog = cloneSanitizedMcpCatalog().filter((candidate) => candidate.name !== name);

    const assessment = assessMcpCatalog(catalog);

    expect(assessment.eligible).toBe(false);
    expect(assessment.missing).toContain(requirement);
  });

  it("reports only the query gap when the filter tool alone is absent", () => {
    const catalog = cloneSanitizedMcpCatalog().filter((candidate) => candidate.name !== "filter_tasks");

    expect(assessMcpCatalog(catalog)).toEqual({
      eligible: false,
      missing: ["task-query"],
      reopenStrategy: "update-status",
      queryStrategy: "unsupported",
    });
  });

  it("loses the update-status reopen strategy along with update_task", () => {
    const catalog = cloneSanitizedMcpCatalog().filter((candidate) => candidate.name !== "update_task");

    const assessment = assessMcpCatalog(catalog);

    expect(assessment.eligible).toBe(false);
    expect(assessment.reopenStrategy).toBe("unsupported");
    expect(assessment.missing).toContain("update");
  });

  it("fails closed when a required tool name appears twice", () => {
    const catalog = cloneSanitizedMcpCatalog();
    catalog.push(structuredClone(tool(catalog, "create_task")));

    const assessment = assessMcpCatalog(catalog);

    expect(assessment.eligible).toBe(false);
    expect(assessment.missing).toContain("create");
  });

  it("fails closed when the filter tool name appears twice", () => {
    const catalog = cloneSanitizedMcpCatalog();
    catalog.push({ name: "filter_tasks", inputSchema: { type: "object", properties: {} } });

    const assessment = assessMcpCatalog(catalog);

    expect(assessment.eligible).toBe(false);
    expect(assessment.queryStrategy).toBe("unsupported");
    expect(assessment.missing).toContain("task-query");
  });

  it.each(["projectIds", "status"])("rejects a filter that cannot scope by a %s array", (field) => {
    const catalog = cloneSanitizedMcpCatalog();
    delete filterProperties(catalog)[field];

    const assessment = assessMcpCatalog(catalog);

    expect(assessment.eligible).toBe(false);
    expect(assessment.queryStrategy).toBe("unsupported");
    expect(assessment.missing).toContain("task-query");
  });

  it("rejects a filter whose status accepts a scalar instead of an array", () => {
    const catalog = cloneSanitizedMcpCatalog();
    filterProperties(catalog).status = { type: "integer" };

    expect(assessMcpCatalog(catalog).queryStrategy).toBe("unsupported");
  });

  it("rejects a filter tool that does not require the filter argument", () => {
    const catalog = cloneSanitizedMcpCatalog();
    tool(catalog, "filter_tasks").inputSchema.required = [];

    expect(assessMcpCatalog(catalog).queryStrategy).toBe("unsupported");
  });

  it("rejects a filter reference that does not resolve", () => {
    const catalog = cloneSanitizedMcpCatalog();
    const schema = tool(catalog, "filter_tasks").inputSchema;
    (schema.properties as JsonObject).filter = { $ref: "#/$defs/MissingFilter" };

    expect(assessMcpCatalog(catalog).queryStrategy).toBe("unsupported");
  });

  it.each(["fromProjectId", "toProjectId", "taskId"])("disqualifies move_task whose move items lack %s", (field) => {
    const catalog = cloneSanitizedMcpCatalog();
    delete moveItemProperties(catalog)[field];

    const assessment = assessMcpCatalog(catalog);

    expect(assessment.eligible).toBe(false);
    expect(assessment.missing).toContain("move");
  });

  it("disqualifies move_task without an array of moves", () => {
    const catalog = cloneSanitizedMcpCatalog();
    tool(catalog, "move_task").inputSchema = {
      type: "object",
      required: ["moves"],
      properties: { moves: { type: "object" } },
    };

    const assessment = assessMcpCatalog(catalog);

    expect(assessment.eligible).toBe(false);
    expect(assessment.missing).toContain("move");
  });

  it("requires the update task argument to describe the task object fields", () => {
    const catalog = cloneSanitizedMcpCatalog();
    const definitions = schemaDefinitions(tool(catalog, "update_task").inputSchema);
    delete (definitions.OpenTask.properties as JsonObject).status;

    const assessment = assessMcpCatalog(catalog);

    expect(assessment.eligible).toBe(false);
    expect(assessment.missing).toContain("update");
  });

  it("fails closed instead of throwing on schemas with hostile getters", () => {
    const catalog = cloneSanitizedMcpCatalog();
    tool(catalog, "create_task").inputSchema = hostileSchema();
    tool(catalog, "filter_tasks").inputSchema = hostileSchema();

    expect(() => assessMcpCatalog(catalog)).not.toThrow();
    const assessment = assessMcpCatalog(catalog);

    expect(assessment.eligible).toBe(false);
    expect(assessment.missing).toContain("create");
    expect(assessment.missing).toContain("task-query");
    expect(assessment.queryStrategy).toBe("unsupported");
  });

  it("fails closed on schemas with wrong-typed shapes", () => {
    const catalog = cloneSanitizedMcpCatalog();
    tool(catalog, "complete_task").inputSchema = { type: "string" };
    tool(catalog, "get_task_by_id").inputSchema = {
      type: "object",
      required: "task_id",
      properties: { task_id: { type: "string" } },
    };
    tool(catalog, "delete_task").inputSchema = {
      type: "object",
      required: ["project_id", "task_id"],
      properties: { project_id: { type: "integer" }, task_id: { type: "string" } },
    };

    const assessment = assessMcpCatalog(catalog);

    expect(assessment.eligible).toBe(false);
    expect(assessment.missing).toContain("complete");
    expect(assessment.missing).toContain("task-lookup");
    expect(assessment.missing).toContain("cleanup-delete");
  });
});

describe("resolveLocalRef", () => {
  it("resolves local $defs references from the schema root", () => {
    const root: JsonObject = { $defs: { OpenTask: { type: "object", properties: {} } } };

    expect(resolveLocalRef({ $ref: "#/$defs/OpenTask" }, root)).toBe((root.$defs as JsonObject).OpenTask);
  });

  it("resolves JSON pointer escape sequences in reference segments", () => {
    const root: JsonObject = { $defs: { "tasks/open": { type: "array" }, "tilde~key": { type: "integer" } } };

    expect(resolveLocalRef({ $ref: "#/$defs/tasks~1open" }, root)).toEqual({ type: "array" });
    expect(resolveLocalRef({ $ref: "#/$defs/tilde~0key" }, root)).toEqual({ type: "integer" });
  });

  it("returns non-reference values unchanged", () => {
    const inline = { type: "string" };

    expect(resolveLocalRef(inline, {})).toBe(inline);
    expect(resolveLocalRef("plain", {})).toBe("plain");
    expect(resolveLocalRef(undefined, {})).toBeUndefined();
  });

  it("returns undefined for dangling references", () => {
    const root: JsonObject = { $defs: { OpenTask: { type: "object" } } };

    expect(resolveLocalRef({ $ref: "#/$defs/Missing" }, root)).toBeUndefined();
    expect(resolveLocalRef({ $ref: "#/definitions/OpenTask/deep" }, root)).toBeUndefined();
  });

  it("leaves external references unresolved", () => {
    const external = { $ref: "https://example.com/schema.json#/Task" };

    expect(resolveLocalRef(external, {})).toBe(external);
  });
});
