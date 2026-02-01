import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { homedir, tmpdir } from "os";
import {
  expandPath,
  isProject,
  findProjects,
  PROJECT_MARKERS,
  EXCLUDED_DIRS,
} from "./utils";

describe("expandPath", () => {
  test("expands tilde to home directory", () => {
    const result = expandPath("~/projects");
    expect(result).toBe(join(homedir(), "projects"));
  });

  test("expands tilde alone", () => {
    const result = expandPath("~");
    expect(result).toBe(homedir());
  });

  test("leaves absolute paths unchanged", () => {
    const result = expandPath("/usr/local/bin");
    expect(result).toBe("/usr/local/bin");
  });

  test("leaves relative paths unchanged", () => {
    const result = expandPath("./projects");
    expect(result).toBe("./projects");
  });
});

describe("isProject", () => {
  const testDir = join(tmpdir(), "project-opener-test-isProject");

  beforeAll(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  test("returns true for directory with .git", () => {
    const projectDir = join(testDir, "git-project");
    mkdirSync(projectDir, { recursive: true });
    mkdirSync(join(projectDir, ".git"));
    expect(isProject(projectDir)).toBe(true);
  });

  test("returns true for directory with package.json", () => {
    const projectDir = join(testDir, "node-project");
    mkdirSync(projectDir, { recursive: true });
    writeFileSync(join(projectDir, "package.json"), "{}");
    expect(isProject(projectDir)).toBe(true);
  });

  test("returns false for empty directory", () => {
    const emptyDir = join(testDir, "empty");
    mkdirSync(emptyDir, { recursive: true });
    expect(isProject(emptyDir)).toBe(false);
  });
});

describe("findProjects", () => {
  const testDir = join(tmpdir(), "project-opener-test-findProjects");

  beforeAll(() => {
    rmSync(testDir, { recursive: true, force: true });
    mkdirSync(testDir, { recursive: true });

    // Create test project structure
    // testDir/
    //   project-a/        (has .git)
    //   project-b/        (has package.json)
    //   not-a-project/    (empty)
    //   nested/
    //     project-c/      (has Cargo.toml)
    //     node_modules/   (should be excluded)
    //       fake-project/ (has package.json but should be skipped)

    mkdirSync(join(testDir, "project-a", ".git"), { recursive: true });
    mkdirSync(join(testDir, "project-b"), { recursive: true });
    writeFileSync(join(testDir, "project-b", "package.json"), "{}");
    mkdirSync(join(testDir, "not-a-project"), { recursive: true });
    mkdirSync(join(testDir, "nested", "project-c"), { recursive: true });
    writeFileSync(join(testDir, "nested", "project-c", "Cargo.toml"), "");
    mkdirSync(join(testDir, "nested", "node_modules", "fake-project"), {
      recursive: true,
    });
    writeFileSync(
      join(testDir, "nested", "node_modules", "fake-project", "package.json"),
      "{}",
    );
  });

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  test("finds projects at depth 1", () => {
    const projects = findProjects(testDir, 1);
    const names = projects.map((p) => p.name);
    expect(names).toContain("project-a");
    expect(names).toContain("project-b");
    expect(names).not.toContain("not-a-project");
  });

  test("finds nested projects at depth 2", () => {
    const projects = findProjects(testDir, 2);
    const names = projects.map((p) => p.name);
    expect(names).toContain("project-c");
  });

  test("excludes node_modules", () => {
    const projects = findProjects(testDir, 3);
    const names = projects.map((p) => p.name);
    expect(names).not.toContain("fake-project");
  });

  test("returns sorted results", () => {
    const projects = findProjects(testDir, 2);
    const names = projects.map((p) => p.name);
    const sorted = [...names].sort((a, b) => a.localeCompare(b));
    expect(names).toEqual(sorted);
  });

  test("includes correct relative paths", () => {
    const projects = findProjects(testDir, 2);
    const projectC = projects.find((p) => p.name === "project-c");
    expect(projectC?.relativePath).toBe(join("nested", "project-c"));
  });
});

describe("constants", () => {
  test("PROJECT_MARKERS includes common markers", () => {
    expect(PROJECT_MARKERS).toContain(".git");
    expect(PROJECT_MARKERS).toContain("package.json");
    expect(PROJECT_MARKERS).toContain("Cargo.toml");
    expect(PROJECT_MARKERS).toContain("go.mod");
  });

  test("EXCLUDED_DIRS includes common build directories", () => {
    expect(EXCLUDED_DIRS.has("node_modules")).toBe(true);
    expect(EXCLUDED_DIRS.has("dist")).toBe(true);
    expect(EXCLUDED_DIRS.has("build")).toBe(true);
    expect(EXCLUDED_DIRS.has(".git")).toBe(true);
  });
});
