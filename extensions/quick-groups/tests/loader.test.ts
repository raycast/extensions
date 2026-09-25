import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { loadReferenceDirectory } from "../src/loader";

const directories: string[] = [];
afterEach(async () =>
  Promise.all(
    directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
  ),
);

async function fixture(): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), "reference-test-"));
  directories.push(directory);
  return directory;
}

describe("loadReferenceDirectory", () => {
  it("recursively combines collections from multiple files", async () => {
    const directory = await fixture();
    await mkdir(path.join(directory, "nested"));
    await writeFile(path.join(directory, "a.yaml"), "machines:\n  dev:\n    ip: 10.0.0.1\n");
    await writeFile(
      path.join(directory, "nested", "b.yml"),
      "machines:\n  staging:\n    ip: 10.0.0.2\n",
    );
    const result = await loadReferenceDirectory(directory);
    expect(result.records.map((record) => record.name)).toEqual(["dev", "staging"]);
    expect(result.diagnostics).toEqual([]);
  });

  it("excludes both sides of a duplicate record conflict", async () => {
    const directory = await fixture();
    await writeFile(path.join(directory, "a.yaml"), "machines:\n  dev:\n    ip: 10.0.0.1\n");
    await writeFile(path.join(directory, "b.yaml"), "machines:\n  dev:\n    ip: 10.0.0.2\n");
    const result = await loadReferenceDirectory(directory);
    expect(result.records).toEqual([]);
    expect(result.diagnostics[0]).toMatchObject({ collection: "machines", record: "dev" });
  });

  it("keeps a record excluded when it is duplicated more than twice", async () => {
    const directory = await fixture();
    await Promise.all(
      ["a", "b", "c"].map((name, index) =>
        writeFile(
          path.join(directory, `${name}.yaml`),
          `machines:\n  dev:\n    ip: 10.0.0.${index + 1}\n`,
        ),
      ),
    );
    const result = await loadReferenceDirectory(directory);
    expect(result.records).toEqual([]);
    expect(result.diagnostics).toHaveLength(2);
  });
});
