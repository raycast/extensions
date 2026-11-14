import { describe, expect, it } from "vitest";
import { buildProcedureInput, FormValidationError } from "../src/lib/form";
import { ApiProcedure } from "../src/types/api";

const procedure: ApiProcedure = {
  description: "Create an article request",
  inputSchema: {
    type: "object",
    properties: {
      title: { type: "string", minLength: 3, maxLength: 140 },
      pledge: { type: "integer", minimum: 5, maximum: 10_000 },
      published: { type: "boolean" },
      status: { type: "string", enum: ["OPEN", "CLOSED"] },
      tags: { type: "array", maxItems: 3, items: { type: "string" } },
    },
    required: ["title", "published", "status"],
    additionalProperties: false,
  },
  path: "articleRequest.create",
  readOnly: false,
  tags: ["articleRequest"],
  type: "mutation",
};

describe("buildProcedureInput", () => {
  it("coerces schema-driven form values", () => {
    expect(
      buildProcedureInput(procedure, {
        title: "Build a local-first backup guide",
        pledge: "25",
        published: true,
        status: '"OPEN"',
        tags: '["backup", "nas"]',
      }),
    ).toEqual({
      title: "Build a local-first backup guide",
      pledge: 25,
      published: true,
      status: "OPEN",
      tags: ["backup", "nas"],
    });
  });

  it("rejects missing required values", () => {
    expect(() => buildProcedureInput(procedure, { published: false, status: '"OPEN"' })).toThrow(FormValidationError);
  });

  it("rejects numeric values outside the catalog range", () => {
    expect(() =>
      buildProcedureInput(procedure, { title: "Valid", pledge: "2", published: true, status: '"OPEN"' }),
    ).toThrow("pledge must be at least 5");
  });
});
