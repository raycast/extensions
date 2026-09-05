import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildProjectSetupSuggestions, suggestionLabelForCommand } from "../lib/project-setup-suggestion";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
  tempDirs.length = 0;
});

function createTempProjectDir(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "quickshell-raycast-"));
  tempDirs.push(dir);
  return dir;
}

describe("project-setup-suggestion", () => {
  it("suggests npm scripts from package.json", () => {
    const directory = createTempProjectDir();
    writeFileSync(
      path.join(directory, "package.json"),
      JSON.stringify({ scripts: { dev: "vite", test: "vitest" } }),
      "utf8",
    );

    const suggestions = buildProjectSetupSuggestions(directory);
    expect(suggestions.map((item) => item.command)).toEqual(["npm run dev", "npm run test"]);
  });

  it("suggests dotnet commands when a csproj is present", () => {
    const directory = createTempProjectDir();
    writeFileSync(path.join(directory, "App.csproj"), "<Project />", "utf8");

    const suggestions = buildProjectSetupSuggestions(directory);
    expect(suggestions.some((item) => item.command === "dotnet build")).toBe(true);
    expect(suggestions.some((item) => item.command.includes("dotnet run --project"))).toBe(true);
  });

  it("suggests docker compose when compose.yaml is present", () => {
    const directory = createTempProjectDir();
    writeFileSync(path.join(directory, "compose.yaml"), "services: {}\n", "utf8");

    const suggestions = buildProjectSetupSuggestions(directory);
    expect(suggestions.some((item) => item.command === "docker compose up")).toBe(true);
  });

  it("derives labels from common command prefixes", () => {
    expect(suggestionLabelForCommand("npm run dev", "Launch")).toBe("Dev");
    expect(suggestionLabelForCommand("dotnet watch", "Launch")).toBe("Watch");
    expect(suggestionLabelForCommand("", "Fallback")).toBe("Fallback");
  });

  it("keeps launch labels unique across dotnet and go suggestions", () => {
    const directory = createTempProjectDir();
    writeFileSync(path.join(directory, "App.csproj"), "<Project />", "utf8");
    writeFileSync(path.join(directory, "go.mod"), "module example.com/app\n", "utf8");

    const suggestions = buildProjectSetupSuggestions(directory);
    const labels = suggestions.map((item) => item.label.toLowerCase());

    expect(new Set(labels).size).toBe(labels.length);
    expect(suggestions.some((item) => item.label === "Dotnet Run")).toBe(true);
    expect(suggestions.some((item) => item.label === "Go Run")).toBe(true);
    expect(suggestions.some((item) => item.label === "Dotnet Tests")).toBe(true);
    expect(suggestions.some((item) => item.label === "Go Tests")).toBe(true);
  });
});
