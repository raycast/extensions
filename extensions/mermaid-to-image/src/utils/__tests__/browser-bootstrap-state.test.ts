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
