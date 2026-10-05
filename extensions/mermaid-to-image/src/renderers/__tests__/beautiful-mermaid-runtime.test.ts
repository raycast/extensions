import fs from "fs";
import os from "os";
import path from "path";
import { describe, expect, it, beforeEach } from "vitest";
import {
  formatBeautifulMermaidSourceLabel,
  getBundledBeautifulMermaidMetadata,
  resetBeautifulMermaidRuntimeCache,
  resolveBeautifulMermaidRuntime,
} from "../beautiful-mermaid-runtime";

function writeBeautifulMermaidPackage(rootDir: string, version: string, label: string) {
  const distDir = path.join(rootDir, "dist");
  fs.mkdirSync(distDir, { recursive: true });

  fs.writeFileSync(
    path.join(rootDir, "package.json"),
    JSON.stringify(
      {
        name: "beautiful-mermaid",
        version,
        type: "module",
        exports: {
          ".": {
            import: "./dist/index.js",
          },
        },
      },
      null,
      2,
    ),
  );

  fs.writeFileSync(
    path.join(distDir, "index.js"),
    `
export const THEMES = { "github-light": { bg: "#fff", fg: "#111" } };
export function renderMermaidSVG(code) { return "<svg data-source=\\"${label}\\">" + code + "</svg>"; }
export function renderMermaidASCII(code, options = {}) {
  return "${label}:" + JSON.stringify(options) + ":" + code;
}
`,
    "utf-8",
  );
}

describe("resolveBeautifulMermaidRuntime", () => {
  beforeEach(() => {
    resetBeautifulMermaidRuntimeCache();
  });

  it("prefers a custom package root over global and bundled sources", async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "beautiful-runtime-"));
    const customRoot = path.join(tempDir, "custom-beautiful");
    const globalModulesRoot = path.join(tempDir, "global", "node_modules");
    const globalRoot = path.join(globalModulesRoot, "beautiful-mermaid");

    writeBeautifulMermaidPackage(customRoot, "9.9.9", "custom");
    writeBeautifulMermaidPackage(globalRoot, "8.8.8", "global");

    const runtime = await resolveBeautifulMermaidRuntime({
      customPath: customRoot,
      globalPackageRoots: [globalModulesRoot],
      bundledModuleLoader: async () => ({
        THEMES: { "github-light": { bg: "#fff", fg: "#111" } },
        renderMermaidSVG: () => "<svg>bundled</svg>",
        renderMermaidASCII: () => "bundled",
      }),
      bundledMetadata: {
        version: "1.1.3",
        resolvedPath: "bundled:beautiful-mermaid",
      },
      notifyBundledFallback: false,
    });

    expect(runtime.sourceKind).toBe("custom");
    expect(runtime.version).toBe("9.9.9");
    expect(runtime.resolvedPath).toContain("custom-beautiful");
  });

  it("accepts a direct custom entry file path", async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "beautiful-runtime-"));
    const customRoot = path.join(tempDir, "custom-beautiful");
    writeBeautifulMermaidPackage(customRoot, "7.7.7", "direct-file");

    const runtime = await resolveBeautifulMermaidRuntime({
      customPath: path.join(customRoot, "dist", "index.js"),
      globalPackageRoots: [],
      bundledModuleLoader: async () => ({
        THEMES: { "github-light": { bg: "#fff", fg: "#111" } },
        renderMermaidSVG: () => "<svg>bundled</svg>",
        renderMermaidASCII: () => "bundled",
      }),
      bundledMetadata: {
        version: "1.1.3",
        resolvedPath: "bundled:beautiful-mermaid",
      },
      notifyBundledFallback: false,
    });

    expect(runtime.sourceKind).toBe("custom");
    expect(runtime.version).toBe("7.7.7");
    expect(runtime.resolvedPath).toContain(path.join("dist", "index.js"));
  });

  it("falls back to bundled metadata when no local source is available", async () => {
    const runtime = await resolveBeautifulMermaidRuntime({
      customPath: "/tmp/does-not-exist",
      globalPackageRoots: [],
      bundledModuleLoader: async () => ({
        THEMES: { "github-light": { bg: "#fff", fg: "#111" } },
        renderMermaidSVG: () => "<svg>bundled</svg>",
        renderMermaidASCII: () => "bundled",
      }),
      bundledMetadata: {
        version: "1.1.3",
        resolvedPath: "bundled:beautiful-mermaid",
      },
      notifyBundledFallback: false,
    });

    expect(runtime.sourceKind).toBe("bundled");
    expect(runtime.version).toBe("1.1.3");
    expect(runtime.usedBundledFallback).toBe(true);
  });

  it("reads the bundled package version instead of reporting unknown", () => {
    const metadata = getBundledBeautifulMermaidMetadata();

    expect(metadata.version).toBe("1.1.3");
    expect(metadata.resolvedPath).toContain("beautiful-mermaid");
  });

  it("formats bundled labels with the bundled fallback version", () => {
    expect(formatBeautifulMermaidSourceLabel({ sourceKind: "bundled", version: "unknown" })).toBe("bundled v1.1.3");
  });
});
