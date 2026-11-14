import { describe, expect, it } from "vitest";

import { providerBrandSource, svgDataUri, themedBrandSource } from "./brand-icons";

function decode(uri: string): string {
  return Buffer.from(uri.replace("data:image/svg+xml;base64,", ""), "base64").toString();
}

describe("brand icons", () => {
  it("encodes a filled SVG path as a data URI", () => {
    const uri = svgDataUri({ path: "M0 0h24v24H0z" }, "2496ED");
    expect(uri.startsWith("data:image/svg+xml;base64,")).toBe(true);
    expect(decode(uri)).toBe(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#2496ED" d="M0 0h24v24H0z"/></svg>',
    );
  });

  it("keeps brand colors that read in both themes", () => {
    const source = themedBrandSource({ path: "M0 0", hex: "2496ED" });
    expect(decode(source.light)).toContain('fill="#2496ED"');
    expect(decode(source.dark)).toContain('fill="#2496ED"');
  });

  it("swaps near-black marks to white in dark mode and near-white marks to black in light mode", () => {
    const dark = themedBrandSource({ path: "M0 0", hex: "000000" });
    expect(decode(dark.light)).toContain('fill="#000000"');
    expect(decode(dark.dark)).toContain('fill="#FFFFFF"');
    const light = themedBrandSource({ path: "M0 0", hex: "FFFFFF" });
    expect(decode(light.light)).toContain('fill="#000000"');
    expect(decode(light.dark)).toContain('fill="#FFFFFF"');
  });

  it("maps providers to cached brand sources", () => {
    const docker = providerBrandSource("docker");
    expect(docker).toBeDefined();
    expect(providerBrandSource("docker")).toBe(docker);
    expect(providerBrandSource("cargo")).toEqual(providerBrandSource("rustup"));
    expect(decode(providerBrandSource("rustup")?.dark ?? "")).toContain('fill="#FFFFFF"');
  });

  it("has no brand for Codex or project artifacts", () => {
    expect(providerBrandSource("codex")).toBeUndefined();
    expect(providerBrandSource("projects")).toBeUndefined();
  });
});
