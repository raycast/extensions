import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { __setReadOnly } from "./__mocks__/raycast-api";
import { WRITE_TOOLS, assertWritable, isReadOnly, readOnlyConfirmation } from "../src/lib/readonly";

beforeAll(() => __setReadOnly(true));
afterAll(() => __setReadOnly(false));

describe("read-only mode", () => {
  it("WRITE_TOOLS covers every known write tool", () => {
    const expected = [
      "draft-email",
      "send-draft",
      "discard-draft",
      "undo-send",
      "mark-spam",
      "trash-thread",
      "unsubscribe",
      "update-thread",
      "update-personalization",
      "create-or-update-event",
    ];
    for (const tool of expected) expect(WRITE_TOOLS.has(tool)).toBe(true);
  });

  it("isReadOnly reflects the preference", () => {
    expect(isReadOnly()).toBe(true);
  });

  it("assertWritable throws for every write tool when read-only", () => {
    for (const tool of WRITE_TOOLS) {
      expect(() => assertWritable(tool), `${tool} should throw`).toThrow(/Read-only mode/);
    }
  });

  it("assertWritable does not throw for non-write tools", () => {
    for (const tool of ["list-threads", "get-thread", "search-inbox", "query-email-and-calendar"]) {
      expect(() => assertWritable(tool)).not.toThrow();
    }
  });

  it("readOnlyConfirmation returns a blocking dialog for write tools", () => {
    const result = readOnlyConfirmation("send-draft");
    expect(result).toBeDefined();
    expect(result?.message).toMatch(/Read-only mode/);
  });

  it("readOnlyConfirmation is undefined for read tools", () => {
    expect(readOnlyConfirmation("list-threads")).toBeUndefined();
  });
});
