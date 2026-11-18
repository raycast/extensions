import assert from "node:assert/strict";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, test } from "node:test";
import { ensureSymlink, replaceSymlink } from "../src/lib/node-symlink.ts";

let dir: string;
let node: string;
let link: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "raycast-firefox-symlink-"));
  node = join(dir, "NodeJS", "runtime", "22.22.2", "bin", "node");
  mkdirSync(join(dir, "NodeJS", "runtime", "22.22.2", "bin"), { recursive: true });
  writeFileSync(node, "");
  link = join(dir, ".raycast-firefox", "node");
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("replaceSymlink", () => {
  test("creates the link, and its parent directory, when nothing is there", () => {
    replaceSymlink(node, link);
    assert.equal(readlinkSync(link), node);
  });

  test("replaces a link whose target no longer exists", () => {
    // Raycast moved its bundled Node from node/runtime/... to NodeJS/runtime/...
    mkdirSync(join(dir, ".raycast-firefox"));
    symlinkSync(join(dir, "node", "runtime", "node-v22.22.2-darwin-arm64", "bin", "node"), link);
    assert.equal(existsSync(link), false, "existsSync reports a dangling link as absent");

    replaceSymlink(node, link);

    assert.equal(readlinkSync(link), node);
  });

  test("replaces a link to another Node.js", () => {
    const other = join(dir, "other-node");
    writeFileSync(other, "");
    mkdirSync(join(dir, ".raycast-firefox"));
    symlinkSync(other, link);

    replaceSymlink(node, link);

    assert.equal(readlinkSync(link), node);
  });

  test("replaces a regular file", () => {
    mkdirSync(join(dir, ".raycast-firefox"));
    writeFileSync(link, "not a link");

    replaceSymlink(node, link);

    assert.equal(readlinkSync(link), node);
  });

  test("leaves a directory in place and says so", () => {
    mkdirSync(link, { recursive: true });
    assert.throws(() => replaceSymlink(node, link), /is a directory/);
    assert.equal(existsSync(link), true);
  });
});

describe("ensureSymlink", () => {
  test("leaves a link that already points at the target alone", () => {
    replaceSymlink(node, link);
    const before = lstatSync(link).ino;
    assert.equal(ensureSymlink(node, link), false);
    assert.equal(lstatSync(link).ino, before, "same link, not recreated");
  });

  test("repairs a link left dangling when Raycast moved its Node.js", () => {
    mkdirSync(join(dir, ".raycast-firefox"));
    symlinkSync(join(dir, "node", "runtime", "node-v22.22.2-darwin-arm64", "bin", "node"), link);
    assert.equal(ensureSymlink(node, link), true);
    assert.equal(readlinkSync(link), node);
  });

  test("creates a missing link", () => {
    assert.equal(ensureSymlink(node, link), true);
    assert.equal(readlinkSync(link), node);
  });
});

describe("replaceSymlink leaves no temporary links behind", () => {
  test("after replacing a link", () => {
    replaceSymlink(node, link);
    replaceSymlink(node, link);
    const leftovers = readdirSync(join(dir, ".raycast-firefox")).filter((n) => n.includes(".tmp-"));
    assert.deepEqual(leftovers, []);
  });
});
