import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { newSessionArgs, SessionInputError, sessionInputFromForm } from "../src/lib/new-session";

async function withDirectory(run: (directory: string) => Promise<void>) {
  const directory = await mkdtemp(join(tmpdir(), "kero new session "));
  try {
    await run(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

function fieldError(field: string) {
  return (error: unknown) => error instanceof SessionInputError && error.field === field;
}

test("single-folder picker values become a literal directory without mutating the form", () => {
  const values = { projectId: "b", name: "Review", directory: ["/tmp/folder with spaces ; $literal"] };
  const original = structuredClone(values);
  assert.deepEqual(sessionInputFromForm(values), {
    projectId: "b",
    name: "Review",
    directory: "/tmp/folder with spaces ; $literal",
  });
  assert.deepEqual(values, original);
});

test("the form requires an existing-project selection instead of automatic assignment", () => {
  for (const values of [{}, { projectId: "" }, { directory: ["/tmp"] }]) {
    assert.throws(() => sessionInputFromForm(values), fieldError("projectId"));
  }
});

test("empty or cleared picker uses the selected project's directory", async () => {
  await withDirectory(async (home) => {
    const projectDirectory = join(home, "project");
    await mkdir(projectDirectory);
    const projects = [{ id: "p", name: "Project", dir: projectDirectory }];
    for (const directory of [undefined, []]) {
      assert.deepEqual(await newSessionArgs(sessionInputFromForm({ projectId: "p", directory }), projects, home), [
        "new",
        "--json",
        "--dir",
        projectDirectory,
        "--project",
        "p",
      ]);
    }
  });
});

test("picker overrides project defaults and revalidates folders before creation", async () => {
  await withDirectory(async (home) => {
    const selected = join(home, "selected folder");
    await mkdir(selected);
    const values = { projectId: "p", directory: [selected] };
    const projects = [{ id: "p", name: "Project", dir: home }];
    assert.deepEqual(await newSessionArgs(sessionInputFromForm(values), projects, home), [
      "new",
      "--json",
      "--dir",
      selected,
      "--project",
      "p",
    ]);
    await rm(selected, { recursive: true });
    await assert.rejects(newSessionArgs(sessionInputFromForm(values), projects, home), fieldError("directory"));
  });
});

test("new session defaults explicitly to Home, without a project or custom name", async () => {
  await withDirectory(async (home) => {
    assert.deepEqual(await newSessionArgs({}, [], home), ["new", "--json", "--dir", home]);
    assert.deepEqual(await newSessionArgs({ name: "  ", directory: "  " }, [], home), ["new", "--json", "--dir", home]);
  });
});

test("selected projects use exact IDs and their directory, including duplicate names", async () => {
  await withDirectory(async (home) => {
    const directory = join(home, "second project");
    await mkdir(directory);
    const projects = [
      { id: "a", name: "same", dir: home },
      { id: "b", name: "same", dir: directory },
    ];
    assert.deepEqual(await newSessionArgs({ projectId: "b" }, projects, home), [
      "new",
      "--json",
      "--dir",
      directory,
      "--project",
      "b",
    ]);
    assert.deepEqual(await newSessionArgs({ projectId: "b", directory: home }, projects, home), [
      "new",
      "--json",
      "--dir",
      home,
      "--project",
      "b",
    ]);
    assert.deepEqual(await newSessionArgs({ projectId: "c" }, [{ id: "c", name: "No Directory" }], home), [
      "new",
      "--json",
      "--dir",
      home,
      "--project",
      "c",
    ]);
  });
});

test("stale project IDs are rejected rather than sent as new project names", async () => {
  await assert.rejects(newSessionArgs({ projectId: "removed" }, []), fieldError("projectId"));
  await assert.rejects(
    newSessionArgs({ projectId: "Project Name" }, [{ id: "id", name: "Project Name" }]),
    fieldError("projectId"),
  );
});

test("directory overrides support home shorthand, spaces, and symlinks without shell expansion", async () => {
  await withDirectory(async (home) => {
    const directory = join(home, "folder with spaces ; $literal");
    await mkdir(directory);
    const alias = join(home, "alias");
    await symlink(directory, alias);
    for (const [value, expected] of [
      ["~", home],
      ["~/folder with spaces ; $literal", directory],
      [alias, alias],
    ]) {
      assert.deepEqual(await newSessionArgs({ directory: value }, [], home), ["new", "--json", "--dir", expected]);
    }
    const trailing = join(home, "trailing space ");
    await mkdir(trailing);
    assert.equal((await newSessionArgs({ directory: trailing }, [], home))[3], trailing);
  });
});

test("relative paths, variables, missing folders, files, and null bytes cannot create sessions", async () => {
  await withDirectory(async (home) => {
    const file = join(home, "file");
    await writeFile(file, "not a folder");
    for (const directory of ["relative", "./relative", "$HOME", "~other", join(home, "missing"), file, `${home}\0`]) {
      await assert.rejects(newSessionArgs({ directory }, [], home), fieldError("directory"));
    }
    await assert.rejects(
      newSessionArgs({ projectId: "p" }, [{ id: "p", name: "Missing", dir: join(home, "missing") }], home),
      fieldError("directory"),
    );
  });
});

test("names remain literal CLI values, with only Kero's whitespace trimming", async () => {
  await withDirectory(async (home) => {
    const name = "--focus $(touch /tmp/never-run) ; 'quoted' / 工作";
    assert.deepEqual(await newSessionArgs({ name: `  ${name}  ` }, [], home), [
      "new",
      "--json",
      "--dir",
      home,
      "--name",
      name,
    ]);
    for (const name of ["a\0b", "a\nb", "a\rb"]) {
      await assert.rejects(newSessionArgs({ name }, [], home), fieldError("name"));
    }
  });
});
