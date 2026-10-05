import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createBlankWorkspace, createWorkspaceFromDirectory } from "../lib/create-workspace-initial";

describe("create-workspace-initial", () => {
  it("returns an empty workspace when directory is missing", () => {
    const workspace = createWorkspaceFromDirectory(undefined);
    expect(workspace.directory).toBe("");
    expect(workspace.name).toBe("");
  });

  it("prefills name and directory without seeding launches or abbreviation", () => {
    const workspace = createWorkspaceFromDirectory("C:\\Projects\\QuickShell");
    expect(workspace.directory).toBe("C:\\Projects\\QuickShell");
    expect(workspace.name).toBe("QuickShell");
    expect(workspace.abbreviation).toBeNull();
    expect(workspace.launches).toHaveLength(1);
    expect(workspace.launches[0].command).toBeNull();
    expect(workspace.id).not.toBe(createBlankWorkspace().id);
  });

  it("prefills git remote and detected dev-server url when present", () => {
    const directory = mkdtempSync(join(tmpdir(), "qs-create-ws-"));
    mkdirSync(join(directory, ".git"));
    writeFileSync(
      join(directory, ".git", "config"),
      '[remote "origin"]\n\turl = git@github.com:acme/demo.git\n',
      "utf8",
    );
    writeFileSync(
      join(directory, "package.json"),
      JSON.stringify({ scripts: { dev: "vite" }, devDependencies: { vite: "5.0.0" } }),
      "utf8",
    );

    const workspace = createWorkspaceFromDirectory(directory);
    expect(workspace.repoUrl).toBe("https://github.com/acme/demo");
    expect(workspace.devServerUrl).toBe("http://localhost:5173");
  });
});
