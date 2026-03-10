import { describe, expect, it } from "vitest";
import { resolveRenderer } from "../select-renderer";

describe("resolveRenderer", () => {
  it("chooses beautiful for supported svg in auto mode", () => {
    const result = resolveRenderer({
      code: "graph TD\nA-->B",
      format: "svg",
      requestedEngine: "auto",
      outputPath: "/tmp/diagram.svg",
    });

    expect(result).toBe("beautiful");
  });

  it("chooses mmdc for unsupported svg in auto mode", () => {
    const result = resolveRenderer({
      code: "journey\ntitle Daily routine",
      format: "svg",
      requestedEngine: "auto",
      outputPath: "/tmp/diagram.svg",
    });

    expect(result).toBe("mmdc");
  });

  it("chooses mmdc for png in auto mode", () => {
    const result = resolveRenderer({
      code: "graph TD\nA-->B",
      format: "png",
      requestedEngine: "auto",
      outputPath: "/tmp/diagram.png",
    });

    expect(result).toBe("mmdc");
  });

  it("chooses mmdc in compatible mode", () => {
    const result = resolveRenderer({
      code: "graph TD\nA-->B",
      format: "svg",
      requestedEngine: "compatible",
      outputPath: "/tmp/diagram.svg",
    });

    expect(result).toBe("mmdc");
  });

  it("chooses beautiful in beautiful mode", () => {
    const result = resolveRenderer({
      code: "journey\ntitle Daily routine",
      format: "svg",
      requestedEngine: "beautiful",
      outputPath: "/tmp/diagram.svg",
    });

    expect(result).toBe("beautiful");
  });
});
