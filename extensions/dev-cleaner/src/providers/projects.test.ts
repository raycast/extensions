import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { ProjectArtifactsProvider } from "./projects";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("project artifacts provider", () => {
  it("finds allowlisted directories without descending into artifacts or symlinks", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "dev-cleaner-projects-"));
    const external = await mkdtemp(path.join(os.tmpdir(), "dev-cleaner-projects-outside-"));
    temporaryDirectories.push(root, external);
    await mkdir(path.join(root, "app/node_modules/nested/build"), { recursive: true });
    await mkdir(path.join(root, "app/.next"), { recursive: true });
    await mkdir(path.join(root, "app/.private/target"), { recursive: true });
    await mkdir(path.join(root, "app/src"), { recursive: true });
    await mkdir(path.join(root, "one/two/three/four/five/six/seven/eight/nine/ten"), { recursive: true });
    await writeFile(path.join(root, "app/node_modules/package"), "1234");
    await mkdir(path.join(external, "target"));
    await symlink(external, path.join(root, "linked"));

    const result = await new ProjectArtifactsProvider().scan({ homeDirectory: root, projectRoots: [root] });
    expect(result.issues).toEqual([]);
    expect(result.candidates.map((candidate) => candidate.title).sort()).toEqual([".next", "node_modules"]);
    expect(result.candidates.every((candidate) => !candidate.selectedByDefault)).toBe(true);
  });

  it("reports inaccessible roots independently", async () => {
    const result = await new ProjectArtifactsProvider().scan({
      homeDirectory: os.tmpdir(),
      projectRoots: [path.join(os.tmpdir(), "definitely-missing-dev-cleaner")],
    });
    expect(result.candidates).toEqual([]);
    expect(result.issues).toHaveLength(1);
  });

  it("deduplicates artifacts discovered through overlapping roots", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "dev-cleaner-project-overlap-"));
    temporaryDirectories.push(root);
    const app = path.join(root, "app");
    await mkdir(path.join(app, "node_modules"), { recursive: true });
    await writeFile(path.join(app, "node_modules/item"), "cache");

    const result = await new ProjectArtifactsProvider().scan({
      homeDirectory: root,
      projectRoots: [root, app],
    });
    expect(result.candidates).toHaveLength(1);
  });
});
