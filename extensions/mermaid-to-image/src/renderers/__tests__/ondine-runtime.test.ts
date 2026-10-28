import { describe, expect, it, vi } from "vitest";
import { createOndineRuntimeLoader, getOndineRuntime, getOndineDiagnostic, ONDINE_VERSION } from "../ondine-runtime";

describe("Ondine runtime boundary", () => {
  it("shares concurrent initialization and retries after rejection without replacing the error", async () => {
    const failure = new Error("initialization failed");
    const runtime = { render: vi.fn() };
    const initialize = vi.fn().mockRejectedValueOnce(failure).mockResolvedValue(runtime);
    const load = createOndineRuntimeLoader(initialize);
    const first = load();
    expect(load()).toBe(first);
    await expect(first).rejects.toBe(failure);
    await expect(load()).resolves.toBe(runtime);
    expect(initialize).toHaveBeenCalledTimes(2);
    expect(await load()).toBe(runtime);
  });

  it("renders real SVG and exposes the pinned package version", async () => {
    const runtime = await getOndineRuntime();
    const result = runtime.render("flowchart LR\n A[使用者] --> B[API]");
    expect(result.svg).toContain("使用者");
    expect(result.type).toBe("flowchart");
    expect(ONDINE_VERSION).toBe("0.0.3");
  });

  it.each([
    ["syntax", "flowchart TD\nA -->", undefined],
    ["semantic", "sequenceDiagram\n deactivate A", undefined],
    ["unsupported-diagram", "not-a-diagram", undefined],
    ["limit", "flowchart LR\nA --> B", { limit: 2 }],
  ] as const)("preserves real %s diagnostics", async (code, source, options) => {
    const runtime = await getOndineRuntime();
    try {
      runtime.render(source, options);
      expect.fail("expected a real RenderError");
    } catch (error) {
      expect(getOndineDiagnostic(error)).toMatchObject({ code });
    }
  });

  it("does not misclassify unknown errors", () => {
    expect(getOndineDiagnostic(new Error("failure"))).toBeUndefined();
  });
});
