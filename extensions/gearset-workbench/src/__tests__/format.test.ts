import { describe, expect, it } from "vitest";
import { auditItemTitle, flattenAuditPayload, isTerminalRunState } from "../format";

describe("Gearset result formatting", () => {
  it("flattens the first list in an audit response", () => {
    expect(flattenAuditPayload({ Deployments: [{ Id: "one" }, { Id: "two" }] })).toHaveLength(2);
  });

  it("chooses a useful audit title", () => {
    expect(auditItemTitle({ FriendlyName: "Sprint deployment", Id: "id" }, 0)).toBe("Sprint deployment");
  });

  it("recognizes terminal CI states", () => {
    expect(isTerminalRunState("Succeeded")).toBe(true);
    expect(isTerminalRunState("Started")).toBe(false);
  });
});
