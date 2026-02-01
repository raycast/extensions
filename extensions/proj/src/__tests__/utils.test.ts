import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { homedir, tmpdir } from "os";
import {
  expandPath,
  isProject,
  findProjects,
  detectLanguage,
  extractGitOrg,
  PROJECT_MARKERS,
  EXCLUDED_DIRS,
} from "../utils";

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

describe("detectLanguage", () => {
  const testDir = join(tmpdir(), "project-opener-test-detectLang");

  beforeAll(() => {
    rmSync(testDir, { recursive: true, force: true });
    mkdirSync(testDir, { recursive: true });
  });

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  test("detects typescript from package.json", () => {
    const projectDir = join(testDir, "ts-project");
    mkdirSync(projectDir, { recursive: true });
    writeFileSync(join(projectDir, "package.json"), "{}");
    writeFileSync(join(projectDir, "tsconfig.json"), "{}");
    expect(detectLanguage(projectDir)).toBe("typescript");
  });

  test("detects javascript from package.json only", () => {
    const projectDir = join(testDir, "js-project");
    mkdirSync(projectDir, { recursive: true });
    writeFileSync(join(projectDir, "package.json"), "{}");
    expect(detectLanguage(projectDir)).toBe("javascript");
  });

  test("detects rust from Cargo.toml", () => {
    const projectDir = join(testDir, "rust-project");
    mkdirSync(projectDir, { recursive: true });
    writeFileSync(join(projectDir, "Cargo.toml"), "");
    expect(detectLanguage(projectDir)).toBe("rust");
  });

  test("detects go from go.mod", () => {
    const projectDir = join(testDir, "go-project");
    mkdirSync(projectDir, { recursive: true });
    writeFileSync(join(projectDir, "go.mod"), "");
    expect(detectLanguage(projectDir)).toBe("go");
  });

  test("detects python from pyproject.toml", () => {
    const projectDir = join(testDir, "py-project");
    mkdirSync(projectDir, { recursive: true });
    writeFileSync(join(projectDir, "pyproject.toml"), "");
    expect(detectLanguage(projectDir)).toBe("python");
  });

  test("returns undefined for unknown project type", () => {
    const projectDir = join(testDir, "unknown-project");
    mkdirSync(projectDir, { recursive: true });
    expect(detectLanguage(projectDir)).toBeUndefined();
  });
});

describe("extractGitOrg", () => {
  const testDir = join(tmpdir(), "project-opener-test-gitorg");

  beforeAll(() => {
    rmSync(testDir, { recursive: true, force: true });
    mkdirSync(testDir, { recursive: true });
  });

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  test("extracts org from github https URL", () => {
    const projectDir = join(testDir, "github-https");
    mkdirSync(join(projectDir, ".git"), { recursive: true });
    writeFileSync(
      join(projectDir, ".git", "config"),
      `[remote "origin"]
	url = https://github.com/acme-corp/my-project.git
	fetch = +refs/heads/*:refs/remotes/origin/*`,
    );
    expect(extractGitOrg(projectDir)).toBe("acme-corp");
  });

  test("extracts org from github ssh URL", () => {
    const projectDir = join(testDir, "github-ssh");
    mkdirSync(join(projectDir, ".git"), { recursive: true });
    writeFileSync(
      join(projectDir, ".git", "config"),
      `[remote "origin"]
	url = git@github.com:my-org/repo.git
	fetch = +refs/heads/*:refs/remotes/origin/*`,
    );
    expect(extractGitOrg(projectDir)).toBe("my-org");
  });

  test("extracts org from gitlab URL", () => {
    const projectDir = join(testDir, "gitlab");
    mkdirSync(join(projectDir, ".git"), { recursive: true });
    writeFileSync(
      join(projectDir, ".git", "config"),
      `[remote "origin"]
	url = https://gitlab.com/company/project.git`,
    );
    expect(extractGitOrg(projectDir)).toBe("company");
  });

  test("returns undefined for non-git directory", () => {
    const projectDir = join(testDir, "no-git");
    mkdirSync(projectDir, { recursive: true });
    expect(extractGitOrg(projectDir)).toBeUndefined();
  });

  test("returns undefined for git dir without remote", () => {
    const projectDir = join(testDir, "no-remote");
    mkdirSync(join(projectDir, ".git"), { recursive: true });
    writeFileSync(join(projectDir, ".git", "config"), "[core]\n\tbare = false");
    expect(extractGitOrg(projectDir)).toBeUndefined();
  });
});
