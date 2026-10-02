import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const desktopProjectsModulePath = "./desktop-projects.ts";
const desktopProjectsModule = import(desktopProjectsModulePath) as Promise<
  typeof import("./desktop-projects")
>;

const firstProject = {
  id: "project-1",
  name: "First Project",
  rootPaths: ["/tmp/first", "/tmp/shared"],
  createdAt: 1_700_000_001_500,
  updatedAt: 1_700_000_002_500,
};

const secondProject = {
  id: "project-2",
  name: "Second Project",
  rootPaths: [],
  createdAt: 1_700_000_003_500,
  updatedAt: 1_700_000_004_500,
};

test("preserves Project order, root order, pins, and explicit thread assignments", async () => {
  const { parseCodexDesktopProjects } = await desktopProjectsModule;

  const projects = parseCodexDesktopProjects({
    "local-projects": {
      "project-1": firstProject,
      "project-2": secondProject,
    },
    "project-order": ["missing", "project-2"],
    "pinned-project-ids": ["project-2", "missing"],
    "projectless-thread-ids": ["thread-projectless"],
    "thread-project-assignments": {
      "thread-1": {
        projectKind: "local",
        projectId: "project-1",
      },
      "thread-2": {
        projectKind: "local",
        projectId: "project-2",
      },
      "thread-stale": {
        projectKind: "local",
        projectId: "missing",
      },
      "thread-projectless": {
        projectKind: "local",
        projectId: "project-1",
      },
    },
  });

  assert.deepEqual(
    projects.map((project) => project.id),
    ["project-2", "project-1"],
  );
  assert.equal(projects[0]?.isPinned, true);
  assert.deepEqual(projects[0]?.threadIds, ["thread-2"]);
  assert.deepEqual(projects[1]?.rootPaths, ["/tmp/first", "/tmp/shared"]);
  assert.deepEqual(projects[1]?.threadIds, ["thread-1"]);
});

test("converts Codex millisecond timestamps to seconds", async () => {
  const { parseCodexDesktopProjects } = await desktopProjectsModule;

  const projects = parseCodexDesktopProjects({
    "local-projects": { "project-1": firstProject },
  });

  assert.equal(projects[0]?.createdAt, 1_700_000_001);
  assert.equal(projects[0]?.updatedAt, 1_700_000_002);
});

test("sorts Projects with stable ties without mutating the default order", async () => {
  const { sortCodexDesktopProjects } = await desktopProjectsModule;
  const projects = [
    {
      id: "zulu",
      name: "Zulu",
      roots: [
        { path: "/tmp/zulu", isAvailable: true },
        { path: "/tmp/shared", isAvailable: true },
      ],
      createdAt: 10,
      updatedAt: 20,
      isPinned: true,
      threadIds: ["thread-1"],
    },
    {
      id: "alpha",
      name: "alpha",
      roots: [{ path: "/tmp/alpha", isAvailable: true }],
      createdAt: 30,
      updatedAt: 40,
      isPinned: false,
      threadIds: ["thread-2", "thread-3"],
    },
    {
      id: "beta",
      name: "Beta",
      roots: [{ path: "/tmp/beta", isAvailable: true }],
      createdAt: 50,
      updatedAt: 60,
      isPinned: false,
      threadIds: ["thread-4", "thread-5"],
    },
  ];

  assert.deepEqual(
    sortCodexDesktopProjects(projects, "default").map((project) => project.id),
    ["zulu", "alpha", "beta"],
  );
  assert.deepEqual(
    sortCodexDesktopProjects(projects, "name").map((project) => project.id),
    ["alpha", "beta", "zulu"],
  );
  assert.deepEqual(
    sortCodexDesktopProjects(projects, "thread-count").map(
      (project) => project.id,
    ),
    ["alpha", "beta", "zulu"],
  );
  assert.deepEqual(
    sortCodexDesktopProjects(projects, "folder-count").map(
      (project) => project.id,
    ),
    ["zulu", "alpha", "beta"],
  );
  assert.deepEqual(
    projects.map((project) => project.id),
    ["zulu", "alpha", "beta"],
  );
});

test("drops malformed Projects independently", async () => {
  const { parseCodexDesktopProjects } = await desktopProjectsModule;

  const projects = parseCodexDesktopProjects({
    "local-projects": {
      "project-1": firstProject,
      "wrong-key": firstProject,
      "invalid-roots": {
        ...secondProject,
        id: "invalid-roots",
        rootPaths: ["/tmp/valid", 42],
      },
    },
  });

  assert.deepEqual(
    projects.map((project) => project.id),
    ["project-1"],
  );
});

test("rejects a non-object global state value", async () => {
  const { parseCodexDesktopProjects } = await desktopProjectsModule;
  assert.throws(
    () => parseCodexDesktopProjects([]),
    /global state must be a JSON object/,
  );
});

test("uses the backup when an existing primary state file is malformed", async () => {
  const { loadCodexDesktopProjects } = await desktopProjectsModule;
  const codexHome = await mkdtemp(join(tmpdir(), "codex-projects-"));
  const rootPath = join(codexHome, "project");

  try {
    await mkdir(rootPath);
    await writeFile(join(codexHome, ".codex-global-state.json"), "invalid");
    await writeFile(
      join(codexHome, ".codex-global-state.json.bak"),
      JSON.stringify({
        "local-projects": {
          "project-1": { ...firstProject, rootPaths: [rootPath] },
        },
      }),
    );

    const projects = await loadCodexDesktopProjects(codexHome);
    assert.equal(projects.length, 1);
    assert.deepEqual(projects[0]?.roots, [
      { path: rootPath, isAvailable: true },
    ]);
  } finally {
    await rm(codexHome, { recursive: true, force: true });
  }
});

test("does not treat a backup as authoritative when the primary is absent", async () => {
  const { loadCodexDesktopProjects } = await desktopProjectsModule;
  const codexHome = await mkdtemp(join(tmpdir(), "codex-projects-"));

  try {
    await writeFile(
      join(codexHome, ".codex-global-state.json.bak"),
      JSON.stringify({ "local-projects": { "project-1": firstProject } }),
    );

    assert.deepEqual(await loadCodexDesktopProjects(codexHome), []);
  } finally {
    await rm(codexHome, { recursive: true, force: true });
  }
});
