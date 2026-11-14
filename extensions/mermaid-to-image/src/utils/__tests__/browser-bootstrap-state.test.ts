import { describe, expect, it } from "vitest";
import { resolveBrowserBootstrapState } from "../browser-bootstrap-state";

describe("resolveBrowserBootstrapState", () => {
  it("requires setup when png output would use mmdc and no browser is available", () => {
    expect(
      resolveBrowserBootstrapState(
        {
          code: "flowchart TD\nA-->B",
          format: "png",
          requestedEngine: "auto",
        },
        { source: "missing" },
      ),
    ).toEqual({
      reason: "PNG output uses the compatible renderer, which needs a browser binary.",
    });
  });

  it("requires setup when unsupported svg syntax falls back to compatible rendering", () => {
    expect(
      resolveBrowserBootstrapState(
        {
          code: "journey\ntitle Test",
          format: "svg",
          requestedEngine: "auto",
        },
        { source: "missing" },
      ),
    ).toEqual({
      reason:
        "This Mermaid syntax is not supported by beautiful-mermaid, so compatible rendering needs a browser binary.",
    });
  });

  it("requires setup before opt-in Ondine PNG when no browser is available", () => {
    expect(
      resolveBrowserBootstrapState(
        { code: "mindmap\n root((Plan))", format: "png", requestedEngine: "auto", useOndineInAuto: true },
        { source: "missing" },
      ),
    ).toEqual({ reason: "Ondine PNG output needs a browser-backed rasterizer." });
    expect(
      resolveBrowserBootstrapState(
        { code: "mindmap\n root((Plan))", format: "png", requestedEngine: "auto", useOndineInAuto: true },
        { source: "environment" },
      ),
    ).toBeNull();
  });

  it("leaves opt-in Ondine SVG to the post-render preview browser check", () => {
    expect(
      resolveBrowserBootstrapState(
        {
          code: "mindmap\n root((Plan))",
          format: "svg",
          requestedEngine: "auto",
          useOndineInAuto: true,
        },
        { source: "missing" },
      ),
    ).toBeNull();
  });

  it("still requires mmdc setup for embedded configuration with opt-in enabled", () => {
    expect(
      resolveBrowserBootstrapState(
        {
          code: '%%{init: {"theme":"dark"}}%%\nmindmap\n root((Plan))',
          format: "svg",
          requestedEngine: "auto",
          useOndineInAuto: true,
        },
        { source: "missing" },
      ),
    ).not.toBeNull();
  });

  it("does not require setup when beautiful rendering can handle the request", () => {
    expect(
      resolveBrowserBootstrapState(
        {
          code: "flowchart TD\nA-->B",
          format: "svg",
          requestedEngine: "auto",
        },
        { source: "missing" },
      ),
    ).toBeNull();
  });
});
