import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { initializeDefaultGroupsDirectory } from "../src/groups-directory";

const directories: string[] = [];

afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("default groups directory", () => {
  it("creates the shipped example on first use without replacing it later", async () => {
    const parent = await mkdtemp(path.join(tmpdir(), "quick-groups-test-"));
    directories.push(parent);
    const directory = path.join(parent, "groups");

    await initializeDefaultGroupsDirectory(directory);
    const file = path.join(directory, "quick-groups-example.yaml");
    expect(await readFile(file, "utf8")).toContain("application/Terminal");

    await initializeDefaultGroupsDirectory(directory);
    expect(await readFile(file, "utf8")).toContain("application/Terminal");
  });
});
