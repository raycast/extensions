import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithOndine } from "../ondine";
import { applyOndineTheme, hasMermaidThemeDirective, mapBeautifulThemeToOndine } from "../ondine-theme";
import { renderDiagramWithHybridStrategy } from "../hybrid-strategy";

const paths: string[] = [];
afterEach(async () => {
  await Promise.all(paths.splice(0).map((file) => fs.rm(file, { force: true, recursive: true })));
});

describe("Ondine manual SVG renderer", () => {
  it("writes materialized, themed SVG with version metadata", async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "ondine-test-"));
    paths.push(directory);
    const outputPath = path.join(directory, "diagram.svg");
    const result = await renderWithOndine(
      { code: "flowchart LR\nA[使用者] --> B[API]", format: "svg", requestedEngine: "ondine", outputPath },
      { themeName: "github-dark" },
    );
    expect(result).toMatchObject({
      engine: "ondine",
      format: "svg",
      outputPath,
      rendererMetadata: { version: "0.0.3", theme: "github-dark" },
    });
    const svg = await fs.readFile(outputPath, "utf8");
    expect(svg).toContain("使用者");
    expect(svg).not.toContain("var(");
    expect(svg).not.toContain("color-mix(");
    expect(svg).toContain("background:#0d1117");
    expect(result.svgRasterStrategy).toBe("browser");
  });

  it("rejects PNG before loading WASM and does not fall back", async () => {
    const renderOndine = vi.fn();
    const renderBeautiful = vi.fn();
    const renderMmdc = vi.fn();
    await expect(
      renderDiagramWithHybridStrategy(
        { code: "flowchart LR\nA-->B", format: "png", requestedEngine: "ondine", outputPath: "/tmp/never.png" },
        { renderOndine, renderBeautiful, renderMmdc },
      ),
    ).rejects.toThrow("SVG only");
    expect(renderOndine).not.toHaveBeenCalled();
    expect(renderBeautiful).not.toHaveBeenCalled();
    expect(renderMmdc).not.toHaveBeenCalled();
  });

  it("preserves manual Ondine failures without fallback", async () => {
    const failure = new Error("source-specific failure");
    const renderMmdc = vi.fn();
    const renderBeautiful = vi.fn();
    await expect(
      renderDiagramWithHybridStrategy(
        { code: "invalid", format: "svg", requestedEngine: "ondine", outputPath: "/tmp/never.svg" },
        { renderOndine: vi.fn().mockRejectedValue(failure), renderBeautiful, renderMmdc },
      ),
    ).rejects.toBe(failure);
    expect(renderMmdc).not.toHaveBeenCalled();
    expect(renderBeautiful).not.toHaveBeenCalled();
  });

  it("warns on ignored theme directives and keeps fixed-time Gantt SVG deterministic", async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "ondine-test-"));
    paths.push(directory);
    const request = {
      code: '%%{init: {"theme":"dark"}}%%\ngantt\n  dateFormat YYYY-MM-DD\n  section Work\n  Task :2026-10-27, 2d',
      format: "svg" as const,
      requestedEngine: "ondine" as const,
      outputPath: path.join(directory, "gantt.svg"),
    };
    const options = { themeName: "github-light", now: Date.UTC(2026, 9, 28) };
    const first = await renderWithOndine(request, options);
    const svg = await fs.readFile(request.outputPath, "utf8");
    await renderWithOndine(request, options);
    expect(await fs.readFile(request.outputPath, "utf8")).toBe(svg);
    expect(first.rendererMetadata?.warnings).toHaveLength(1);
  });

  it("does not leave an SVG when compilation fails", async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "ondine-test-"));
    paths.push(directory);
    const outputPath = path.join(directory, "invalid.svg");
    await expect(
      renderWithOndine({ code: "flowchart TD\n A[", format: "svg", requestedEngine: "ondine", outputPath }),
    ).rejects.toThrow();
    await expect(fs.access(outputPath)).rejects.toThrow();
  });
});

describe("Ondine theme bridge", () => {
  it("maps explicit palette colors with stable fallbacks and rejects unsafe values", () => {
    expect(mapBeautifulThemeToOndine({ bg: "#fff", fg: "#000", accent: "#123456" })).toMatchObject({
      "--ondine-bg": "#fff",
      "--ondine-fg": "#000",
      "--ondine-accent": "#123456",
      "--ondine-border": "#000",
    });
    expect(() => mapBeautifulThemeToOndine({ bg: '"><script>', fg: "#000" })).toThrow();
  });
  it("injects root CSS deterministically and idempotently without altering text", () => {
    const palette = mapBeautifulThemeToOndine({ bg: "#fff", fg: "#000" });
    const input = '<svg class="ondine" style="--_fg:var(--ondine-fg,#000)"><text>&lt;hello&gt;</text></svg>';
    const output = applyOndineTheme(input, palette);
    expect(applyOndineTheme(output, palette)).toBe(output);
    expect(output).toContain("&lt;hello&gt;");
    expect(output.match(/--ondine-bg:/g)).toHaveLength(1);
  });
  it.each([
    ['%%{init: {"theme": "dark"}}%%\nflowchart LR\nA-->B', true],
    ["---\nconfig:\n  theme: dark\n---\nflowchart LR\nA-->B", true],
    ['%%{init: {"themeVariables": {}}}%%\nflowchart LR\nA-->B', true],
    ['flowchart LR\nA["theme: dark"] --> B', false],
    ["%% ordinary comment theme: dark\nflowchart LR\nA-->B", false],
    ["---\ntitle: theme park\n---\nflowchart LR\nA-->B", false],
  ])("detects real theme directives without label/comment false positives", (source, expected) => {
    expect(hasMermaidThemeDirective(source)).toBe(expected);
  });
});
