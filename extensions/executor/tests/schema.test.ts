import { describe, expect, test } from "bun:test";
import {
  buildToolArguments,
  createToolInputPlan,
  initialValuesForPlan,
  parseJsonArguments,
  ToolInputError,
} from "../src/lib/schema";
import type { ToolSchema } from "../src/lib/types";

function schema(inputSchema: unknown, schemaDefinitions?: Record<string, unknown>): ToolSchema {
  return {
    address: "user.test.default.run",
    inputSchema,
    schemaDefinitions,
  };
}

function fields(inputSchema: unknown, schemaDefinitions?: Record<string, unknown>) {
  const plan = createToolInputPlan(schema(inputSchema, schemaDefinitions));
  expect(plan.mode).toBe("fields");
  if (plan.mode !== "fields") throw new Error("Expected native fields");
  return plan;
}

describe("createToolInputPlan", () => {
  test("builds a nested body payload with exact keys", () => {
    const plan = fields({
      type: "object",
      required: ["body"],
      properties: {
        body: {
          type: "object",
          required: ["user_id"],
          properties: {
            user_id: { type: "string" },
            notify: { type: "boolean" },
          },
        },
      },
    });

    const [userId, notify] = plan.fields;
    const args = buildToolArguments(plan, { [userId.id]: "abc", [notify.id]: false }, new Set([userId.id, notify.id]));

    expect(args).toEqual({ body: { user_id: "abc", notify: false } });
  });

  test("preserves optional values including empty text, false, and zero", () => {
    const plan = fields({
      type: "object",
      properties: {
        note: { type: "string" },
        enabled: { type: "boolean" },
        count: { type: "integer" },
      },
    });
    const [note, enabled, count] = plan.fields;

    expect(
      buildToolArguments(
        plan,
        { [note.id]: "", [enabled.id]: false, [count.id]: "0" },
        new Set([note.id, enabled.id, count.id]),
      ),
    ).toEqual({ note: "", enabled: false, count: 0 });
    expect(buildToolArguments(plan, {}, new Set())).toEqual({});
  });

  test("preserves enum value types", () => {
    const plan = fields({
      type: "object",
      required: ["limit", "enabled"],
      properties: {
        limit: { type: "number", enum: [0, 10] },
        enabled: { type: "boolean", enum: [true, false] },
      },
    });
    const [limit, enabled] = plan.fields;

    expect(
      buildToolArguments(plan, {
        [limit.id]: limit.enumOptions?.[1].id,
        [enabled.id]: enabled.enumOptions?.[1].id,
      }),
    ).toEqual({ limit: 10, enabled: false });
  });

  test("resolves local and response-level schema definitions", () => {
    const local = fields({
      type: "object",
      properties: { query: { $ref: "#/$defs/Query" } },
      $defs: { Query: { type: "string" } },
    });
    const external = fields(
      {
        type: "object",
        properties: { query: { $ref: "#/definitions/Query" } },
      },
      { Query: { type: "string" } },
    );
    const rootReference = fields({
      $ref: "#/$defs/Input",
      $defs: {
        Input: {
          type: "object",
          properties: { query: { type: "string" } },
        },
      },
    });

    expect(local.fields[0].kind).toBe("string");
    expect(external.fields[0].kind).toBe("string");
    expect(rootReference.fields[0].kind).toBe("string");
  });

  test.each([
    [{ type: "array", items: { type: "string" } }, "root array"],
    [{ type: "object", properties: { value: { oneOf: [{ type: "string" }, { type: "number" }] } } }, "union"],
    [{ type: "object", additionalProperties: true, properties: {} }, "dynamic properties"],
    [{ type: "object" }, "open object"],
    [{ type: "object", properties: {} }, "open empty object"],
    [
      {
        type: "object",
        properties: {
          options: {
            type: "object",
            required: ["query"],
            properties: { query: { type: "string" }, page: { type: "integer" } },
          },
        },
      },
      "optional object with required children",
    ],
    [
      {
        type: "object",
        required: ["options"],
        properties: {
          options: { type: "object", additionalProperties: false, properties: {} },
        },
      },
      "required empty object",
    ],
    [{ $ref: "#/$defs/Loop", $defs: { Loop: { $ref: "#/$defs/Loop" } } }, "cyclic reference"],
  ])("uses JSON fallback for %s", (inputSchema) => {
    expect(createToolInputPlan(schema(inputSchema)).mode).toBe("json");
  });

  test("only treats an explicitly closed empty object as no arguments", () => {
    expect(createToolInputPlan(schema({ type: "object", additionalProperties: false, properties: {} })).mode).toBe(
      "empty",
    );
  });
});

describe("argument validation", () => {
  test("validates required fields and primitive types", () => {
    const plan = fields({
      type: "object",
      required: ["count"],
      properties: { count: { type: "integer" } },
    });
    const [count] = plan.fields;

    expect(() => buildToolArguments(plan, {})).toThrow(ToolInputError);
    expect(() => buildToolArguments(plan, { [count.id]: "1.5" })).toThrow("must be a whole number");
  });

  test("accepts an empty string when a required string field is present", () => {
    const plan = fields({
      type: "object",
      required: ["query"],
      properties: { query: { type: "string" } },
    });
    const [query] = plan.fields;

    expect(buildToolArguments(plan, { [query.id]: "" })).toEqual({ query: "" });
  });

  test("omits an optional field after it is unset without coercing its edited value", () => {
    const plan = fields({
      type: "object",
      properties: { query: { type: "string" }, enabled: { type: "boolean" } },
    });
    const [query, enabled] = plan.fields;
    const editedValues = { [query.id]: "", [enabled.id]: false };

    expect(buildToolArguments(plan, editedValues, new Set([query.id, enabled.id]))).toEqual({
      query: "",
      enabled: false,
    });
    expect(buildToolArguments(plan, editedValues, new Set())).toEqual({});
  });

  test("rejects malformed JSON and non-object roots", () => {
    expect(() => parseJsonArguments("{")).toThrow("valid JSON");
    expect(() => parseJsonArguments("[]")).toThrow("JSON object");
    expect(() => parseJsonArguments("null")).toThrow("JSON object");
  });

  test("keeps prototype-like keys as own data properties", () => {
    const plan = fields({
      type: "object",
      required: ["__proto__", "constructor"],
      properties: JSON.parse(
        '{"__proto__":{"type":"object","required":["polluted"],"properties":{"polluted":{"type":"boolean"}}},"constructor":{"type":"string"}}',
      ),
    });
    const [polluted, constructor] = plan.fields;
    const args = buildToolArguments(plan, {
      [polluted.id]: true,
      [constructor.id]: "value",
    });

    expect(Object.prototype.hasOwnProperty.call(args, "__proto__")).toBe(true);
    expect((args.__proto__ as Record<string, unknown>).polluted).toBe(true);
    expect(args.constructor).toBe("value");
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();

    const parsed = parseJsonArguments('{"__proto__":{"safe":true}}');
    expect(Object.prototype.hasOwnProperty.call(parsed, "__proto__")).toBe(true);
  });
});

describe("initialValuesForPlan", () => {
  test("round trips supported presets without losing optional values", () => {
    const plan = fields({
      type: "object",
      properties: {
        query: { type: "string" },
        page: { type: "integer" },
        exact: { type: "boolean" },
      },
    });
    const initial = initialValuesForPlan(plan, { query: "", page: 0, exact: false });

    expect(initial).toBeDefined();
    expect(buildToolArguments(plan, initial!.values, initial!.includedFieldIds)).toEqual({
      query: "",
      page: 0,
      exact: false,
    });
  });

  test("returns undefined when native fields would drop payload data", () => {
    const plan = fields({
      type: "object",
      properties: { query: { type: "string" } },
    });

    expect(initialValuesForPlan(plan, { query: "test", extra: true })).toBeUndefined();
  });

  test("allows a saved optional preset value to return to omission", () => {
    const plan = fields({
      type: "object",
      properties: { query: { type: "string" } },
    });
    const initial = initialValuesForPlan(plan, { query: "saved" });

    expect(initial).toBeDefined();
    expect(buildToolArguments(plan, initial!.values, new Set())).toEqual({});
  });
});
