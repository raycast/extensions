import { mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { matchingPinSources, scanRuntimePins } from "./runtime-pins";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("runtime pins", () => {
  it("finds Node and Rust pins while skipping generated artifacts", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "dev-cleaner-pins-"));
    temporaryDirectories.push(root);
    await mkdir(path.join(root, "app"), { recursive: true });
    await writeFile(path.join(root, "app/.node-version"), "22.16.0\n");
    await writeFile(path.join(root, "app/rust-toolchain.toml"), '[toolchain]\nchannel = "nightly-2026-09-01"\n');
    await mkdir(path.join(root, "node_modules/pkg"), { recursive: true });
    await writeFile(path.join(root, "node_modules/pkg/.nvmrc"), "18");

    const pins = await scanRuntimePins([root]);
    const canonicalRoot = await realpath(root);

    expect(matchingPinSources(pins.node, "v22.16.0")).toEqual([path.join(canonicalRoot, "app/.node-version")]);
    expect(matchingPinSources(pins.node, "v18.20.0")).toEqual([]);
    expect(matchingPinSources(pins.rust, "nightly-2026-09-01-aarch64-apple-darwin")).toEqual([
      path.join(canonicalRoot, "app/rust-toolchain.toml"),
    ]);
  });

  it("ignores missing project roots and supports legacy rust-toolchain files", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "dev-cleaner-pins-legacy-"));
    temporaryDirectories.push(root);
    await writeFile(path.join(root, "rust-toolchain"), "stable\n");
    const pins = await scanRuntimePins([path.join(root, "missing"), root]);
    expect(matchingPinSources(pins.rust, "stable-aarch64-apple-darwin")).toHaveLength(1);
  });

  it("reads TOML from an extension-less rust-toolchain file", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "dev-cleaner-pins-toml-legacy-"));
    temporaryDirectories.push(root);
    await writeFile(path.join(root, "rust-toolchain"), '[toolchain]\nchannel = "1.80.0"\ncomponents = ["clippy"]\n');
    const pins = await scanRuntimePins([root]);
    expect([...pins.rust.keys()]).toEqual(["1.80.0"]);
    expect(matchingPinSources(pins.rust, "1.80.0-aarch64-apple-darwin")).toHaveLength(1);
  });

  it("ignores empty or incomplete pin files", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "dev-cleaner-pins-empty-"));
    temporaryDirectories.push(root);
    await writeFile(path.join(root, ".nvmrc"), "\n");
    await writeFile(path.join(root, "rust-toolchain.toml"), '[toolchain]\nprofile = "minimal"\n');
    await expect(scanRuntimePins([root])).resolves.toMatchObject({
      node: expect.any(Map),
      rust: expect.any(Map),
    });
    const fileRoot = path.join(root, "not-a-directory");
    await writeFile(fileRoot, "file");
    await expect(scanRuntimePins([fileRoot])).rejects.toThrow();
  });

  it("stops descending past the maximum project depth", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "dev-cleaner-pins-depth-"));
    temporaryDirectories.push(root);
    const shallow = path.join(root, ...Array.from({ length: 8 }, (_, index) => `level-${index}`));
    const deep = path.join(shallow, "level-8");
    await mkdir(deep, { recursive: true });
    await writeFile(path.join(shallow, ".node-version"), "20.0.0\n");
    await writeFile(path.join(deep, ".node-version"), "16.0.0\n");

    const pins = await scanRuntimePins([root]);

    expect(matchingPinSources(pins.node, "v20.0.0")).toHaveLength(1);
    expect(matchingPinSources(pins.node, "v16.0.0")).toEqual([]);
  });
});
