import { describe, expect, it } from "vitest";
import { decodePillKey, encodePillKey } from "../lib/workspace-form-state";

describe("pill key codec", () => {
  it("round-trips task type and command", () => {
    const key = encodePillKey({ taskType: "frontend", command: "npm run dev" });
    expect(decodePillKey(key)).toEqual({ taskType: "frontend", command: "npm run dev" });
  });

  it("supports commands containing commas", () => {
    const key = encodePillKey({ taskType: "api", command: 'git commit -m "a, b"' });
    expect(decodePillKey(key)?.command).toBe('git commit -m "a, b"');
  });
});
