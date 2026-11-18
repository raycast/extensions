import { beforeEach, describe, expect, it, vi } from "vitest";

const open = vi.fn();

vi.mock("@raycast/api", () => ({
  open,
  showToast: vi.fn(),
  Toast: { Style: { Success: "success" } },
}));
vi.mock("@raycast/utils", () => ({ showFailureToast: vi.fn() }));

describe("submit tip tool", () => {
  beforeEach(() => open.mockReset());

  it("encodes mail fields exactly once", async () => {
    const { default: submitTip } = await import("../src/tools/submit-tip");

    await submitTip({ title: "New product", description: "Details & price", name: "Olli" });

    const openedUrl = open.mock.calls[0]?.[0];
    expect(openedUrl).toBeTypeOf("string");
    const mailto = new URL(openedUrl as string);
    expect(mailto.searchParams.get("subject")).toBe("Tip for Caschys Blog: New product");
    expect(mailto.searchParams.get("body")).toContain("Description: Details & price");
  });
});
