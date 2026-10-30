import assert from "node:assert/strict";
import { test } from "node:test";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { resolveTargetApp } from "../src/lib/target-app";
import { discoverApps } from "../src/lib/app-discovery";
import { newProjectUrl } from "../src/lib/new-project-url";
import { editProjectUrl } from "../src/lib/edit-project-url";
import { getProjectDeletion } from "../src/lib/project-deletion";

const installed = (paths: string[]) => (candidate: string) =>
  paths.includes(candidate);
test("Auto prefers Internal; explicit choices never silently fall back", () => {
  const both = installed([
    "/Applications/Glaze.app",
    "/Applications/Glaze Internal.app",
  ]);
  assert.equal(
    resolveTargetApp("auto", "/home/me", both).scheme,
    "glaze-internal",
  );
  assert.equal(
    resolveTargetApp("production", "/home/me", both).scheme,
    "glaze",
  );
  const production = installed(["/Applications/Glaze.app"]);
  assert.equal(
    resolveTargetApp("auto", "/home/me", production).scheme,
    "glaze",
  );
  assert.equal(
    resolveTargetApp("internal", "/home/me", production).installed,
    false,
  );
  assert.equal(
    resolveTargetApp(
      "auto",
      "/home/me",
      installed(["/home/me/Applications/Glaze Internal.app"]),
    ).installed,
    true,
  );
});

async function fixture(t: { after: (fn: () => Promise<void>) => void }) {
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), "glaze-extension-test-"),
  );
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return root;
}
async function manifest(root: string, relative: string, value: object) {
  const directory = path.join(root, relative);
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(
    path.join(directory, "package.json"),
    JSON.stringify(value),
  );
  return directory;
}

test("discovers current and legacy projects, deduplicates roots, and resolves relative bundle symlinks", async (t) => {
  const root = await fixture(t);
  const projects = path.join(root, "projects");
  const bundles = path.join(root, "bundles");
  const pkg = {
    name: "timer",
    id: "abc",
    productName: "Timer",
    glaze: { appId: "timer-local-abc", variant: "local" },
  };
  await manifest(root, "projects/Timer/sources", pkg);
  const runtime = await manifest(root, "projects/Timer/runtime", pkg);
  await manifest(root, "legacy/old/.glaze", {
    name: "old",
    id: "def",
    productName: "Old",
  });
  await fs.mkdir(path.join(bundles, "Timer.app/Contents/Resources"), {
    recursive: true,
  });
  const link = path.join(bundles, "Timer.app/Contents/Resources/glaze-runtime");
  await fs.symlink(path.relative(path.dirname(link), runtime), link);
  await manifest(root, "bundles/Store.app/Contents/Resources/glaze-runtime", {
    name: "store",
    id: "ghi",
    storeAppId: "store-id",
    glaze: { appId: "store-store-ghi", variant: "store" },
  });
  const apps = await discoverApps(
    [projects, projects, path.join(root, "legacy"), path.join(root, "absent")],
    [bundles],
  );
  assert.equal(apps.length, 3);
  const timer = apps.find((app) => app.id === "timer-local-abc")!;
  assert.equal(timer.sourcesPath, path.join(projects, "Timer/sources"));
  assert.equal(timer.bundlePath, path.join(bundles, "Timer.app"));
  const deletion = getProjectDeletion(timer);
  assert.equal(deletion.title, "Delete Project");
  assert.deepEqual(deletion.paths, [
    path.join(projects, "Timer"),
    timer.bundlePath,
  ]);
  assert.equal(deletion.successTitle, "Project deleted");
  assert.equal(apps.find((app) => app.name === "old")?.variant, "local");
  assert.equal(apps.find((app) => app.name === "store")?.variant, "store");
});

test("a corrupted project does not hide valid projects", async (t) => {
  const root = await fixture(t);
  await manifest(root, "Good/sources", { name: "good", id: "abc" });
  const broken = await manifest(root, "Broken/sources", {});
  await fs.writeFile(path.join(broken, "package.json"), "not JSON");
  assert.equal((await discoverApps([root], [])).length, 1);
});

test("malformed manifest fields cannot reach project lists or AI tools", async (t) => {
  const root = await fixture(t);
  await manifest(root, "BadName/sources", {
    name: { title: "broken" },
    id: "bad",
  });
  await manifest(root, "BadId/sources", {
    name: "bad-id",
    id: { value: "bad" },
  });
  await manifest(root, "Good/sources", {
    name: "good",
    id: "abc",
    productName: { value: "broken" },
    description: ["broken"],
    version: 5,
    author: { name: 123 },
    glaze: { appId: [], displayName: true, sdkVersion: {} },
  });
  const apps = await discoverApps([root], []);
  assert.equal(apps.length, 1);
  assert.equal(apps[0].id, "good-local-abc");
  assert.equal(apps[0].displayName, "good");
  assert.equal(apps[0].version, "1.0.0");
  assert.equal(apps[0].description, undefined);
  assert.equal(apps[0].author, undefined);
  assert.deepEqual(structuredClone(apps), apps);
});

test("store manifests cannot opt into local project editing; previews stay separate", async (t) => {
  const root = await fixture(t);
  await manifest(root, "Store.app/Contents/Resources/glaze-runtime", {
    name: "store",
    id: "abc",
    storeAppId: "store-id",
    glaze: { variant: "local" },
  });
  await manifest(root, "Preview.app/Contents/Resources/glaze-runtime", {
    name: "preview",
    id: "def",
    glaze: { variant: "preview" },
  });
  const apps = await discoverApps([], [root]);
  assert.equal(apps.find((app) => app.name === "store")?.variant, "store");
  assert.equal(apps.find((app) => app.name === "preview")?.variant, "preview");
});

test("orphaned local bundles stay local and broken links do not hide store installs", async (t) => {
  const root = await fixture(t);
  const runtime = await manifest(root, "projects/Orphan/runtime", {
    name: "orphan",
    id: "abc",
  });
  for (const [name, target] of [
    ["Orphan", runtime],
    ["Broken", path.join(root, "missing")],
  ]) {
    const directory = path.join(
      root,
      "bundles",
      `${name}.app/Contents/Resources`,
    );
    await fs.mkdir(directory, { recursive: true });
    await fs.symlink(target, path.join(directory, "glaze-runtime"));
  }
  await manifest(root, "bundles/Store.app/Contents/Resources/glaze-runtime", {
    name: "store",
    id: "def",
  });
  const apps = await discoverApps([], [path.join(root, "bundles")]);
  assert.equal(apps.length, 2);
  const orphan = apps.find((app) => app.name === "orphan")!;
  assert.equal(orphan.variant, "local");
  assert.equal(orphan.runtimePath, await fs.realpath(runtime));
  const deletion = getProjectDeletion(orphan);
  assert.equal(deletion.title, "Delete App Bundle");
  assert.deepEqual(deletion.paths, [path.join(root, "bundles/Orphan.app")]);
  assert.match(deletion.message, /Only the app bundle will move to Trash/);
  assert.match(deletion.message, /Linked project files will remain on disk/);
  assert.equal(deletion.successTitle, "App bundle deleted");
  assert.equal(apps.find((app) => app.name === "store")?.variant, "store");
});

test("edit links preserve paths, IDs, and prompts under Swift URL decoding", () => {
  const projectPath = "/Users/me/Glaze/My + Timer/sources";
  const prompt = "Add a + button & keep 100% of the UI\n日本語 👋";
  for (const scheme of ["glaze", "glaze-internal"] as const) {
    const url = new URL(
      editProjectUrl(scheme, projectPath, "timer-local-abc", prompt),
    );
    assert.equal(url.protocol, `${scheme}:`);
    assert.equal(url.hostname, "edit-app");
    const params = Object.fromEntries(
      url.search
        .slice(1)
        .split("&")
        .map((pair) => pair.split("=").map(decodeURIComponent)),
    );
    assert.deepEqual(params, {
      path: projectPath,
      appId: "timer-local-abc",
      prompt,
    });
    assert.equal(
      new URL(editProjectUrl(scheme, projectPath)).searchParams.has("prompt"),
      false,
    );
  }
  assert.throws(
    () => editProjectUrl("glaze", projectPath, undefined, "  "),
    /Enter the changes/,
  );
  assert.throws(
    () => editProjectUrl("glaze", projectPath, undefined, "👋".repeat(16385)),
    /64 KB/,
  );
});

test("new-project links target each flavor and preserve Unicode, newlines, and reserved characters", () => {
  const prompt = 'A timer: "hello" & + # % `no shell` $(no shell)\nЗдравей 👋';
  for (const scheme of ["glaze", "glaze-internal"] as const) {
    const link = newProjectUrl(scheme, prompt);
    const url = new URL(link);
    assert.equal(url.protocol, `${scheme}:`);
    assert.equal(url.hostname, "new");
    assert.equal(url.searchParams.get("prompt"), prompt);
    assert.equal(url.searchParams.has("submit"), false);
    assert.equal(url.search.includes("+"), false);
    // Match URLComponents decoding as well as a browser's URLSearchParams.
    assert.equal(
      decodeURIComponent(url.search.slice("?prompt=".length)),
      prompt,
    );
  }
});

test("blank and oversized app ideas are rejected; surrounding whitespace is preserved", () => {
  assert.throws(() => newProjectUrl("glaze", "  "), /Enter an idea/);
  assert.throws(() => newProjectUrl("glaze", "x".repeat(65537)), /64 KB/);
  assert.equal(
    new URL(newProjectUrl("glaze", " Timer ")).searchParams.get("prompt"),
    " Timer ",
  );
});
