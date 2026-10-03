import { describe, expect, test } from "bun:test";
import { executionFailed, pausedInteraction, safeBrowserUrl, toolCallCode, resultTable } from "../src/lib/execution";

describe("tool execution boundaries", () => {
  test("serializes inputs and addresses without interpreting them as code", async () => {
    const args = JSON.parse(
      '{"label":"` ${process.exit()} \\"; throw Error() //","__proto__":{"polluted":true},"count":0,"enabled":false}',
    );
    const calls: unknown[] = [];
    const code = toolCallCode("tools.demo.user.main.search", args);
    const fn = new Function("tools", `return (async () => { ${code} })()`);
    await fn({
      "demo.user.main.search": (value: unknown) => {
        calls.push(value);
      },
    });
    expect(calls).toEqual([args]);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
  test("rejects an invalid tool path", () => {
    expect(() => toolCallCode("tools.__proto__.bad", {})).toThrow();
  });
  test("only resumes an explicit top-level execution ID", () => {
    expect(pausedInteraction({ status: "paused", text: "", structured: { result: { id: "wrong" } } })).toBeUndefined();
    expect(
      pausedInteraction({
        status: "paused",
        text: "",
        structured: { executionId: "correct", interaction: { kind: "form" } },
      })?.executionId,
    ).toBe("correct");
  });
  test("upstream tool errors remain failures even when the sandbox completed", () => {
    expect(
      executionFailed({
        status: "completed",
        isError: false,
        text: "",
        structured: { result: { ok: false, error: { message: "Denied" } } },
      }),
    ).toBe(true);
  });
  test("only opens secure browser flows or explicit loopback URLs", () => {
    expect(safeBrowserUrl("javascript:alert(1)")).toBeUndefined();
    expect(safeBrowserUrl("https://user:secret@example.com")).toBeUndefined();
    expect(safeBrowserUrl("http://example.com")).toBeUndefined();
    expect(safeBrowserUrl("https://example.com/auth")).toBe("https://example.com/auth");
  });
  test("table previews are bounded and escape markup", () => {
    const table = resultTable(Array.from({ length: 30 }, () => ({ name: "[link](https://a)", value: "x|y" })));
    expect(table).toContain("20 of 30");
    expect(table).toContain("x\\|y");
    expect(resultTable({ data: "not rows" })).toBeUndefined();
  });
});
